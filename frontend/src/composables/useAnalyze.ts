import { ref } from "vue";
import type { DocumentAnalysis } from "../types";
import type { AnalyzePayload } from "./useDocumentInput";
import type { DocRef } from "./useDocumentChat";

// Normalize any analyze payload into the {fileName, mimeType, dataBase64} form
// needed by /api/ask on every turn.
function normalizeToDoc(payload: AnalyzePayload): DocRef {
  if ("dataBase64" in payload) {
    return { fileName: payload.fileName, mimeType: payload.mimeType, dataBase64: payload.dataBase64 };
  }
  // Text payload: encode UTF-8 → base64 so the worker can decode it via buildContentBlock
  return {
    fileName: "pasted-text.txt",
    mimeType: "text/plain",
    dataBase64: btoa(unescape(encodeURIComponent(payload.text))),
  };
}

export function useAnalyze() {
  const analysis = ref<DocumentAnalysis | null>(null);
  const doc = ref<DocRef | null>(null);
  const loading = ref(false);
  const error = ref<{ kind: string; message: string } | null>(null);
  const askToken = ref<string | null>(null);

  async function analyze(payload: AnalyzePayload, turnstileToken?: string) {
    loading.value = true;
    error.value = null;
    analysis.value = null;
    doc.value = null;
    askToken.value = null;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, turnstileToken }),
      });
      const data = (await res.json()) as
        | { analysis: DocumentAnalysis; askToken?: string }
        | { error: { kind: string; message: string } };
      if (!res.ok) {
        const err = "error" in data ? data.error : { kind: "error", message: "An unexpected error occurred." };
        if (err.kind === "rate_limited") {
          error.value = { kind: "rate_limited", message: "The service is busy — try again in a moment." };
        } else {
          error.value = err;
        }
      } else {
        const success = data as { analysis: DocumentAnalysis; askToken?: string };
        analysis.value = success.analysis;
        askToken.value = success.askToken ?? null;
        doc.value = normalizeToDoc(payload);
      }
    } catch {
      error.value = { kind: "network", message: "Network error. Please try again." };
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    analysis.value = null;
    doc.value = null;
    error.value = null;
    askToken.value = null;
  }

  return { analysis, doc, loading, error, askToken, analyze, reset };
}
