import {
  MAX_CHARS,
  MAX_BYTES,
  MAX_TURNS,
  ACCEPT_EXT,
  ACCEPT_MIME,
} from "document-intelligence-shared";
import { callClaude, buildContentBlock, streamAsk } from "./claude";
import type { DocRef, PriorMessage } from "./claude";
import { verifyTurnstile, mintAskToken, verifyAskToken } from "./auth";

interface Env {
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_BASE_URL: string;
  ANTHROPIC_MODEL: string;
  TURNSTILE_SECRET: string;
  ASK_TOKEN_SECRET: string;
  CF_AIG_TOKEN: string;
  ASSETS: Fetcher;
}

function base64ByteSize(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

function getExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

function errJson(kind: string, message: string, status: number): Response {
  return Response.json({ error: { kind, message } }, { status });
}

function getConfig(env: Env) {
  return {
    apiKey: env.ANTHROPIC_API_KEY,
    baseUrl: env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
    model: env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
    cfAigToken: env.CF_AIG_TOKEN || undefined,
  };
}

const EMPTY_MSG = "Paste some text or attach a file to begin — we'll take it from there.";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Non-API requests go to static assets. run_worker_first ensures the Worker
    // is only invoked for /api/* in production; this is a belt-and-suspenders fallback.
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // ─── POST /api/analyze ─────────────────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/api/analyze") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errJson("empty", EMPTY_MSG, 400);
      }

      if (!body || typeof body !== "object") {
        return errJson("empty", EMPTY_MSG, 400);
      }

      const payload = body as Record<string, unknown>;

      // Verify Turnstile token before any Claude call
      const turnstileToken = typeof payload.turnstileToken === "string" ? payload.turnstileToken : "";
      const ip = request.headers.get("CF-Connecting-IP") ?? undefined;
      if (!await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, ip)) {
        return errJson("unauthorized", "Security check failed. Please try again.", 403);
      }

      let contentBlock: ReturnType<typeof buildContentBlock>;
      let fileName: string;
      let fileType: string;

      if ("text" in payload) {
        const text = payload.text;
        if (typeof text !== "string" || text.length === 0) {
          return errJson("empty", EMPTY_MSG, 400);
        }
        if (text.length > MAX_CHARS) {
          const over = text.length - MAX_CHARS;
          return errJson(
            "over",
            `You're ${over.toLocaleString()} characters over. Trim it down, or attach the document as a file instead.`,
            413,
          );
        }
        fileName = "pasted-text.txt";
        fileType = "text/plain";
        const encoded = btoa(unescape(encodeURIComponent(text)));
        contentBlock = buildContentBlock("text/plain", encoded);
      } else if ("dataBase64" in payload) {
        const { fileName: fn, mimeType, dataBase64 } = payload as {
          fileName?: unknown;
          mimeType?: unknown;
          dataBase64?: unknown;
        };

        if (typeof dataBase64 !== "string" || !dataBase64) {
          return errJson("empty", EMPTY_MSG, 400);
        }

        const fileNameStr = typeof fn === "string" ? fn : "";
        const mimeTypeStr = typeof mimeType === "string" ? mimeType : "";

        const byteSize = base64ByteSize(dataBase64);
        if (byteSize > MAX_BYTES) {
          const sizeMB = (byteSize / (1024 * 1024)).toFixed(1);
          return errJson(
            "size",
            `"${fileNameStr}" is ${sizeMB} MB. The limit is 2 MB — try a smaller file, or paste the text instead.`,
            413,
          );
        }

        const ext = getExt(fileNameStr);
        const extOk = ACCEPT_EXT.includes(ext);
        const mimeOk = !mimeTypeStr || ACCEPT_MIME.includes(mimeTypeStr);
        if (!extOk || !mimeOk) {
          return errJson(
            "type",
            `"${ext || fileNameStr}" isn't something we can read. Use a PDF, an image (PNG / JPG / WebP), or plain text (.txt, .md, .csv).`,
            415,
          );
        }

        fileName = fileNameStr;
        fileType = mimeTypeStr;
        contentBlock = buildContentBlock(mimeTypeStr, dataBase64);
      } else {
        return errJson("empty", EMPTY_MSG, 400);
      }

      try {
        const analysis = await callClaude(getConfig(env), contentBlock, fileName, fileType);
        const askToken = await mintAskToken(env.ASK_TOKEN_SECRET);
        return Response.json({ analysis, askToken });
      } catch (e) {
        if ((e as { kind?: string }).kind === "rate_limited") {
          return errJson("rate_limited", "The service is busy — try again in a moment.", 429);
        }
        return errJson("analyze_failed", "Document analysis failed. Please try again.", 502);
      }
    }

    // ─── POST /api/ask ─────────────────────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/api/ask") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errJson("invalid", "Invalid request body.", 400);
      }

      if (!body || typeof body !== "object") {
        return errJson("invalid", "Invalid request body.", 400);
      }

      const payload = body as Record<string, unknown>;

      // Verify ask token before any processing
      const askToken = typeof payload.askToken === "string" ? payload.askToken : "";
      if (!await verifyAskToken(askToken, env.ASK_TOKEN_SECRET)) {
        return errJson("session_expired", "Session expired — analyze a document to start a new session.", 401);
      }

      const { doc, messages, question } = payload as {
        doc?: unknown;
        messages?: unknown;
        question?: unknown;
      };

      // Validate question
      if (typeof question !== "string" || !question.trim()) {
        return errJson("empty", "Question cannot be empty.", 400);
      }

      // Validate doc
      if (!doc || typeof doc !== "object") {
        return errJson("invalid", "Document is required.", 400);
      }
      const rawDoc = doc as Record<string, unknown>;
      const { fileName: docFileName, mimeType: docMime, dataBase64: docData } = rawDoc;

      if (typeof docData !== "string" || !docData) {
        return errJson("invalid", "Document data is required.", 400);
      }

      const fileNameStr = typeof docFileName === "string" ? docFileName : "";
      const mimeTypeStr = typeof docMime === "string" ? docMime : "";

      // Reuse server-side size/type guards — never trust the client
      const byteSize = base64ByteSize(docData);
      if (byteSize > MAX_BYTES) {
        return errJson("size", "Document too large.", 413);
      }

      const ext = getExt(fileNameStr);
      if (!ACCEPT_EXT.includes(ext) || (mimeTypeStr && !ACCEPT_MIME.includes(mimeTypeStr))) {
        return errJson("type", "Unsupported file type.", 415);
      }

      // Validate messages array and turn cap
      if (!Array.isArray(messages)) {
        return errJson("invalid", "Messages must be an array.", 400);
      }
      if (messages.length >= MAX_TURNS) {
        return errJson("over", "Conversation limit reached. Analyze another document to continue.", 429);
      }

      const priorMessages: PriorMessage[] = messages.map((m: unknown) => {
        const msg = m as { role?: unknown; content?: unknown };
        return {
          role: msg.role === "assistant" ? "assistant" : "user",
          content: typeof msg.content === "string" ? msg.content : "",
        };
      });

      const docRef: DocRef = { fileName: fileNameStr, mimeType: mimeTypeStr, dataBase64: docData };
      const stream = streamAsk(getConfig(env), docRef, priorMessages, question.trim());

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
