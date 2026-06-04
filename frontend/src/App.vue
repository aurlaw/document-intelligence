<script setup lang="ts">
import { ref } from "vue";
import type { DocumentAnalysis } from "./types";

const analysis = ref<DocumentAnalysis | null>(null);
const answer = ref<string | null>(null);
const loading = ref(false);

async function runAnalyze() {
  loading.value = true;
  try {
    const res = await fetch("/api/analyze", { method: "POST" });
    analysis.value = await res.json();
    answer.value = null;
  } finally {
    loading.value = false;
  }
}

async function runAsk() {
  loading.value = true;
  try {
    const res = await fetch("/api/ask", { method: "POST" });
    const data = await res.json();
    answer.value = data.answer;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="padding: 2rem; font-family: sans-serif;">
    <h1>DocuIntel — Phase 0 stub</h1>

    <div style="margin-bottom: 1rem;">
      <button @click="runAnalyze" :disabled="loading">Run stub analyze</button>
      <button @click="runAsk" :disabled="loading" style="margin-left: 0.5rem;">Ask (stub)</button>
    </div>

    <div v-if="analysis">
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
    </div>

    <div v-if="answer">
      <h2>Answer</h2>
      <p>{{ answer }}</p>
    </div>
  </div>
</template>
