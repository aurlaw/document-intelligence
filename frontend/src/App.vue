<script setup lang="ts">
import DocumentInput from "./components/DocumentInput.vue";
import type { AnalyzePayload } from "./composables/useDocumentInput";
import { useAnalyze } from "./composables/useAnalyze";

const { analysis, loading, error, analyze } = useAnalyze();

function handleAnalyze(payload: AnalyzePayload) {
  analyze(payload);
}

function entityLabel(label?: string, value?: string): string {
  return label ? `${label}: ${value ?? ""}` : (value ?? "");
}
</script>

<template>
  <div style="padding: 2rem; font-family: sans-serif; max-width: 800px;">
    <h1>DocIntel — Phase 2</h1>

    <DocumentInput :disabled="loading" @submit="handleAnalyze" />

    <div v-if="loading" style="margin-top: 1rem; color: #9097a6;">Analyzing…</div>

    <div
      v-if="error"
      style="
        margin-top: 1rem;
        padding: 0.75rem;
        background: #2a0e0e;
        color: #f99;
        border: 1px solid #6b1e1e;
        border-radius: 4px;
      "
    >
      <strong>Error:</strong> {{ error.message }}
    </div>

    <div v-if="analysis" style="margin-top: 1.5rem;">
      <h2>{{ analysis.documentType }}</h2>

      <p>
        <strong>File:</strong> {{ analysis.fileName }}
        <span v-if="analysis.pageCount"> &nbsp;·&nbsp; {{ analysis.pageCount }} pp</span>
        <span v-if="analysis.confidence !== undefined">
          &nbsp;·&nbsp; Confidence: {{ analysis.confidence }}%
        </span>
      </p>

      <p>{{ analysis.summary }}</p>

      <h3>Key Entities</h3>

      <p v-if="analysis.keyEntities.people.length">
        <strong>People</strong><br />
        <span
          v-for="item in analysis.keyEntities.people"
          :key="item.value"
          style="display: block; margin-left: 1rem;"
        >{{ entityLabel(item.label, item.value) }}</span>
      </p>

      <p v-if="analysis.keyEntities.organizations.length">
        <strong>Organizations</strong><br />
        <span
          v-for="item in analysis.keyEntities.organizations"
          :key="item.value"
          style="display: block; margin-left: 1rem;"
        >{{ entityLabel(item.label, item.value) }}</span>
      </p>

      <p v-if="analysis.keyEntities.dates.length">
        <strong>Dates</strong><br />
        <span
          v-for="item in analysis.keyEntities.dates"
          :key="item.value"
          style="display: block; margin-left: 1rem;"
        >{{ entityLabel(item.label, item.value) }}</span>
      </p>

      <p v-if="analysis.keyEntities.topics.length">
        <strong>Topics</strong><br />
        <span
          v-for="item in analysis.keyEntities.topics"
          :key="item.value"
          style="display: block; margin-left: 1rem;"
        >{{ item.value }}</span>
      </p>

      <h3>Suggested Questions</h3>
      <ul>
        <li v-for="q in analysis.suggestedQuestions" :key="q">{{ q }}</li>
      </ul>
    </div>
  </div>
</template>
