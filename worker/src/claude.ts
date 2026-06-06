import type { DocumentAnalysis } from "./types";

export interface ClaudeConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

type ClaudeContentBlock =
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "text"; text: string };

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
