import type { DocumentAnalysis } from "./types";

export interface ClaudeConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

type CacheControl = { type: "ephemeral" };

type ClaudeContentBlock =
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string }; cache_control?: CacheControl }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string }; cache_control?: CacheControl }
  | { type: "text"; text: string; cache_control?: CacheControl };

function decodeBase64ToText(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function buildContentBlock(mimeType: string, data: string): ClaudeContentBlock {
  if (mimeType === "application/pdf")
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  if (mimeType.startsWith("image/"))
    return { type: "image", source: { type: "base64", media_type: mimeType, data } };
  return { type: "text", text: decodeBase64ToText(data) };
}

function buildContentBlockWithCache(mimeType: string, data: string): ClaudeContentBlock {
  const block = buildContentBlock(mimeType, data);
  return { ...block, cache_control: { type: "ephemeral" } } as ClaudeContentBlock;
}

// ─── Phase 2: structured analysis via forced tool call ───────────────────────

const ANALYSIS_TOOL = {
  name: "record_document_analysis",
  description: "Record the structured analysis of the document.",
  input_schema: {
    type: "object",
    required: ["documentType", "summary", "keyEntities", "suggestedQuestions"],
    properties: {
      documentType: { type: "string", description: "E.g. 'Lease Agreement', 'Invoice', 'Contract'" },
      confidence: { type: "number", minimum: 0, maximum: 100 },
      pageCount: { type: "number", description: "PDFs only, model best-effort estimate" },
      summary: { type: "string", description: "A few sentences, not a wall of text" },
      keyEntities: {
        type: "object",
        required: ["people", "organizations", "dates", "topics"],
        properties: {
          people: {
            type: "array",
            items: {
              type: "object",
              required: ["value"],
              properties: {
                label: { type: "string", description: "Role: LANDLORD, TENANT, WITNESS, etc." },
                value: { type: "string" },
              },
            },
          },
          organizations: {
            type: "array",
            items: {
              type: "object",
              required: ["value"],
              properties: {
                label: { type: "string" },
                value: { type: "string" },
              },
            },
          },
          dates: {
            type: "array",
            items: {
              type: "object",
              required: ["value"],
              properties: {
                label: { type: "string", description: "Semantic label: START, END, SIGNED, RENT DUE, etc." },
                value: { type: "string" },
              },
            },
          },
          topics: {
            type: "array",
            items: {
              type: "object",
              required: ["value"],
              properties: {
                value: { type: "string" },
              },
            },
          },
        },
      },
      suggestedQuestions: {
        type: "array",
        items: { type: "string" },
        description: "3-4 questions a user might want to ask about this document",
      },
    },
  },
};

const SYSTEM_PROMPT =
  "You are a document analysis assistant. Extract a structured analysis from the provided document. " +
  "Be faithful to the document content — do not infer or invent facts. Extract: " +
  "a concise summary (2–4 sentences); the document type; your confidence (0–100) in the document type; " +
  "page count for PDFs (best estimate); key entities grouped as people (with role labels where evident), " +
  "organizations, dates (with semantic labels like START, END, SIGNED, RENT DUE where clear), and topics; " +
  "3–4 suggested questions a user might want to ask about this document.";

const ANALYSIS_INSTRUCTION =
  "Analyze this document and call record_document_analysis with the structured result.";

function isValidAnalysis(obj: unknown): obj is Omit<DocumentAnalysis, "fileName" | "fileType"> {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.documentType !== "string") return false;
  if (typeof o.summary !== "string") return false;
  if (!Array.isArray(o.suggestedQuestions)) return false;
  const ke = o.keyEntities as Record<string, unknown> | undefined;
  if (!ke || typeof ke !== "object") return false;
  if (!Array.isArray(ke.people) || !Array.isArray(ke.organizations) ||
      !Array.isArray(ke.dates) || !Array.isArray(ke.topics)) return false;
  return true;
}

export async function callClaude(
  config: ClaudeConfig,
  contentBlock: ClaudeContentBlock,
  fileName: string,
  fileType: string,
): Promise<DocumentAnalysis> {
  const body = {
    model: config.model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "record_document_analysis" },
    messages: [
      {
        role: "user",
        content: [contentBlock, { type: "text", text: ANALYSIS_INSTRUCTION }],
      },
    ],
  };

  const res = await fetch(`${config.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Claude API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const response = (await res.json()) as {
    content?: Array<{ type: string; name?: string; input?: unknown }>;
  };

  const toolBlock = response.content?.find(
    (b) => b.type === "tool_use" && b.name === "record_document_analysis",
  );

  if (!toolBlock || !isValidAnalysis(toolBlock.input)) {
    throw new Error("Claude returned no valid tool_use block");
  }

  const input = toolBlock.input as Omit<DocumentAnalysis, "fileName" | "fileType">;
  return { ...input, fileName, fileType };
}

// ─── Phase 3: streaming Q&A (stateless) ──────────────────────────────────────

const QA_SYSTEM_PROMPT =
  "You are a document Q&A assistant. Answer only from the provided document. " +
  "Cite the relevant clause or section where possible. " +
  "If the answer is not in the document, say so plainly. " +
  "Decline requests that are not about the document.";

// Seed reply that follows the doc user message, establishing role alternation.
const DOC_SEED_REPLY =
  "I have reviewed the document and am ready to answer your questions.";

export interface PriorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DocRef {
  fileName: string;
  mimeType: string;
  dataBase64: string;
}

export function streamAsk(
  config: ClaudeConfig,
  doc: DocRef,
  priorMessages: PriorMessage[],
  question: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  function sseEvent(event: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const docBlock = buildContentBlockWithCache(doc.mimeType, doc.dataBase64);

        const messages: Array<{ role: string; content: unknown }> = [
          // First user message: doc with cache_control + generic instruction
          {
            role: "user",
            content: [
              docBlock,
              { type: "text", text: "The document above is provided for context." },
            ],
          },
          // Seed assistant reply so role alternation is maintained for all subsequent turns
          { role: "assistant", content: DOC_SEED_REPLY },
          // Prior Q&A turns
          ...priorMessages.map((m) => ({ role: m.role, content: m.content })),
          // New question
          { role: "user", content: question },
        ];

        const body = {
          model: config.model,
          max_tokens: 1024,
          system: QA_SYSTEM_PROMPT,
          stream: true,
          messages,
        };

        const res = await fetch(`${config.baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          controller.enqueue(sseEvent("error", { message: "Claude API error. Please try again." }));
          controller.close();
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split on \n\n to get complete SSE events; keep trailing incomplete fragment
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.trim()) continue;

            let eventName = "";
            let dataLine = "";
            for (const line of part.split("\n")) {
              if (line.startsWith("event: ")) eventName = line.slice(7).trim();
              if (line.startsWith("data: ")) dataLine = line.slice(6);
            }

            if (!dataLine) continue;

            let parsed: unknown;
            try {
              parsed = JSON.parse(dataLine);
            } catch {
              // Partial fragment — wait for more bytes
              continue;
            }

            if (eventName === "content_block_delta") {
              const delta = (parsed as { delta?: { type?: string; text?: string } }).delta;
              if (delta?.type === "text_delta" && typeof delta.text === "string") {
                controller.enqueue(sseEvent("delta", { text: delta.text }));
              }
            } else if (eventName === "message_stop") {
              controller.enqueue(sseEvent("done", {}));
              controller.close();
              return;
            } else if (eventName === "error") {
              const msg =
                (parsed as { error?: { message?: string } }).error?.message ?? "Stream error";
              controller.enqueue(sseEvent("error", { message: msg }));
              controller.close();
              return;
            }
            // ping, message_start, content_block_start, content_block_stop, message_delta — ignored
          }
        }

        // Stream ended without message_stop
        controller.enqueue(sseEvent("done", {}));
        controller.close();
      } catch {
        try {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: "Stream interrupted. Please try again." })}\n\n`,
            ),
          );
          controller.close();
        } catch {
          // Controller already closed
        }
      }
    },
  });
}
