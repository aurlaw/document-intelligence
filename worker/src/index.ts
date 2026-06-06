import {
  MAX_CHARS,
  MAX_BYTES,
  ACCEPT_EXT,
  ACCEPT_MIME,
} from "document-intelligence-shared";
import { callClaude, buildContentBlock } from "./claude";

interface Env {
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_BASE_URL: string;
  ANTHROPIC_MODEL: string;
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

const EMPTY_MSG = "Paste some text or attach a file to begin — we'll take it from there.";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

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
        // Text is already a string, so we base64-encode it to reuse buildContentBlock
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

      const config = {
        apiKey: env.ANTHROPIC_API_KEY,
        baseUrl: env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
        model: env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      };

      try {
        const analysis = await callClaude(config, contentBlock, fileName, fileType);
        return Response.json({ analysis });
      } catch {
        return errJson("analyze_failed", "Document analysis failed. Please try again.", 502);
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
