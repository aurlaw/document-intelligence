<script setup lang="ts">
import { ref } from "vue";
import type { DocumentAnalysis } from "./types";
import DocumentInput from "./components/DocumentInput.vue";
import type { AnalyzePayload } from "./composables/useDocumentInput";

const analysis = ref<DocumentAnalysis | null>(null);
const answer = ref<string | null>(null);
const serverError = ref<{ kind: string; message: string } | null>(null);
const loading = ref(false);

async function handleAnalyze(payload: AnalyzePayload) {
  loading.value = true;
  serverError.value = null;
  analysis.value = null;
  answer.value = null;
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: { kind: string; message: string } } & DocumentAnalysis;
    if (!res.ok) {
      serverError.value = data.error ?? { kind: "error", message: "An unexpected error occurred." };
    } else {
      analysis.value = data;
    }
  } catch {
    serverError.value = { kind: "network", message: "Network error. Please try again." };
  } finally {
    loading.value = false;
  }
}

async function runAsk() {
  loading.value = true;
  try {
    const res = await fetch("/api/ask", { method: "POST" });
    const data = (await res.json()) as { answer: string };
    answer.value = data.answer;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="padding: 2rem; font-family: sans-serif; max-width: 800px;">
    <h1>DocIntel — Phase 1</h1>

    <DocumentInput :disabled="loading" @submit="handleAnalyze" />

    <div v-if="loading" style="margin-top: 1rem; color: #9097a6;">Analyzing…</div>

    <div
      v-if="serverError"
      style="
        margin-top: 1rem;
        padding: 0.75rem;
        background: #2a0e0e;
        color: #f99;
        border: 1px solid #6b1e1e;
        border-radius: 4px;
      "
    >
      <strong>Error:</strong> {{ serverError.message }}
    </div>

    <div v-if="analysis" style="margin-top: 1.5rem;">
      <h2>{{ analysis.documentType }}</h2>
      <p><strong>File:</strong> {{ analysis.fileName }}</p>
      <p>{{ analysis.summary }}</p>

      <h3>Key Entities</h3>
      <p><strong>People:</strong> {{ analysis.keyEntities.people.join(", ") }}</p>
      <p><strong>Organizations:</strong> {{ analysis.keyEntities.organizations.join(", ") }}</p>
      <p><strong>Dates:</strong> {{ analysis.keyEntities.dates.join(", ") }}</p>
      <p><strong>Topics:</strong> {{ analysis.keyEntities.topics.join(", ") }}</p>

      <h3>Suggested Questions</h3>
      <ul>
        <li v-for="q in analysis.suggestedQuestions" :key="q">{{ q }}</li>
      </ul>

      <button @click="runAsk" :disabled="loading" style="margin-top: 0.5rem;">
        Ask (stub)
      </button>
    </div>

    <div v-if="answer" style="margin-top: 1.5rem;">
      <h2>Answer</h2>
      <p>{{ answer }}</p>
    </div>
  </div>
</template>
