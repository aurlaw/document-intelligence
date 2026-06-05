import type { DocumentAnalysis } from "./types";
import {
  MAX_CHARS,
  MAX_BYTES,
  ACCEPT_EXT,
  ACCEPT_MIME,
} from "document-intelligence-shared";

const STUB_ANALYSIS: DocumentAnalysis = {
  fileName: "Maple_Court_Residential_Lease.pdf",
  fileType: "application/pdf",
  documentType: "Lease Agreement",
  summary:
    "A 12-month residential lease for Unit 4B at 218 Maple Court, between landlord Eleanor R. Whitfield (via Maple Court Property Management LLC) and tenant Marcus T. Doyle. Rent is $2,450/month, due on the 1st, with a $2,450 security deposit and a $75 late fee after a 5-day grace period.",
  keyEntities: {
    people: ["Eleanor R. Whitfield", "Marcus T. Doyle", "Priya Anand"],
    organizations: ["Maple Court Property Management LLC", "Sentinel Renters Insurance Co."],
    dates: ["Aug 1, 2025", "Jul 31, 2026", "1st of month", "Jul 18, 2025"],
    topics: [
      "Rent $2,450/mo",
      "Security deposit",
      "Pet addendum",
      "Subletting clause",
      "Late fees",
      "60-day notice",
      "Maintenance",
    ],
  },
  suggestedQuestions: [
    "What is the monthly rent and when is it due?",
    "Can the tenant sublet the unit?",
    "What are the penalties for paying rent late?",
    "How much notice is required to end the lease?",
  ],
};

const STUB_ANSWER =
  "No — subletting or assignment is prohibited without the landlord's prior written consent. Under §9.1, an unauthorized sublet is a material breach and grounds for termination.";

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
  async fetch(request: Request): Promise<Response> {
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
            413
          );
        }
      } else if ("dataBase64" in payload) {
        const { fileName, mimeType, dataBase64 } = payload as {
          fileName?: unknown;
          mimeType?: unknown;
          dataBase64?: unknown;
        };

        if (typeof dataBase64 !== "string" || !dataBase64) {
          return errJson("empty", EMPTY_MSG, 400);
        }

        const fileNameStr = typeof fileName === "string" ? fileName : "";
        const mimeTypeStr = typeof mimeType === "string" ? mimeType : "";

        const byteSize = base64ByteSize(dataBase64);
        if (byteSize > MAX_BYTES) {
          const sizeMB = (byteSize / (1024 * 1024)).toFixed(1);
          return errJson(
            "size",
            `"${fileNameStr}" is ${sizeMB} MB. The limit is 2 MB — try a smaller file, or paste the text instead.`,
            413
          );
        }

        const ext = getExt(fileNameStr);
        const extOk = ACCEPT_EXT.includes(ext);
        const mimeOk = !mimeTypeStr || ACCEPT_MIME.includes(mimeTypeStr);
        if (!extOk || !mimeOk) {
          return errJson(
            "type",
            `"${ext || fileNameStr}" isn't something we can read. Use a PDF, an image (PNG / JPG / WebP), or plain text (.txt, .md, .csv).`,
            415
          );
        }
      } else {
        return errJson("empty", EMPTY_MSG, 400);
      }

      return Response.json(STUB_ANALYSIS);
    }

    if (request.method === "POST" && url.pathname === "/api/ask") {
      return Response.json({ answer: STUB_ANSWER });
    }

    return new Response("Not Found", { status: 404 });
  },
};
