import { ref } from "vue";
import type { DocumentAnalysis } from "../types";
import type { AnalyzePayload } from "./useDocumentInput";

export function useAnalyze() {
  const analysis = ref<DocumentAnalysis | null>(null);
  const loading = ref(false);
  const error = ref<{ kind: string; message: string } | null>(null);

  async function analyze(payload: AnalyzePayload) {
    loading.value = true;
    error.value = null;
    analysis.value = null;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as
        | { analysis: DocumentAnalysis }
        | { error: { kind: string; message: string } };
      if (!res.ok) {
        error.value =
          "error" in data ? data.error : { kind: "error", message: "An unexpected error occurred." };
      } else {
        analysis.value = (data as { analysis: DocumentAnalysis }).analysis;
      }
    } catch {
      error.value = { kind: "network", message: "Network error. Please try again." };
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    analysis.value = null;
    error.value = null;
  }

  return { analysis, loading, error, analyze, reset };
}
