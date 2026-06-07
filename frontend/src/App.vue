<script setup lang="ts">
import { ref } from "vue";
import DocumentInput from "./components/DocumentInput.vue";
import type { AnalyzePayload } from "./composables/useDocumentInput";
import { useAnalyze } from "./composables/useAnalyze";
import { useDocumentChat } from "./composables/useDocumentChat";

const { analysis, doc, loading, error, analyze, reset: resetAnalyze } = useAnalyze();
const chat = useDocumentChat();

const questionInput = ref("");

function handleAnalyze(payload: AnalyzePayload) {
  chat.reset();
  analyze(payload);
}

function entityLabel(label?: string, value?: string): string {
  return label ? `${label}: ${value ?? ""}` : (value ?? "");
}

async function sendQuestion() {
  const q = questionInput.value.trim();
  if (!q || chat.busy.value || !doc.value) return;
  questionInput.value = "";
  await chat.ask(doc.value, q);
}

async function sendSuggested(q: string) {
  if (chat.busy.value || !doc.value) return;
  await chat.ask(doc.value, q);
}

function retryLastQuestion(msgIndex: number) {
  // Walk backwards from the error to find the preceding user question
  for (let i = msgIndex - 1; i >= 0; i--) {
    if (chat.messages.value[i].role === "user") {
      const q = chat.messages.value[i].text;
      // Remove the error message then re-ask
      chat.messages.value.splice(msgIndex, 1);
      if (doc.value) chat.ask(doc.value, q);
      return;
    }
  }
}

function resetAll() {
  resetAnalyze();
  chat.reset();
  questionInput.value = "";
}
</script>

<template>
  <div style="padding: 2rem; font-family: sans-serif; max-width: 800px;">
    <h1>DocIntel — Phase 3</h1>

    <!-- Input form — hidden once analysis is ready -->
    <template v-if="!analysis">
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
    </template>

    <!-- Analysis + Chat — visible after successful analyze -->
    <template v-if="analysis">
      <!-- ── Analysis panel ── -->
      <div style="margin-top: 1.5rem;">
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

        <!-- Suggested questions — clickable -->
        <div v-if="analysis.suggestedQuestions.length" style="margin-top: 0.5rem;">
          <strong>Suggested questions</strong>
          <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
            <button
              v-for="q in analysis.suggestedQuestions"
              :key="q"
              :disabled="chat.busy.value || chat.atCap.value"
              style="
                padding: 0.35rem 0.65rem;
                font-size: 0.875rem;
                cursor: pointer;
                background: #1a2535;
                border: 1px solid #2a3a55;
                border-radius: 4px;
                color: #c5cfe0;
                text-align: left;
              "
              @click="sendSuggested(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Chat section ── -->
      <div style="margin-top: 2rem; border-top: 1px solid #333; padding-top: 1rem;">
        <h3 style="margin-top: 0;">Ask about this document</h3>

        <!-- Message list -->
        <div
          v-for="(msg, i) in chat.messages.value"
          :key="i"
          style="margin-bottom: 0.75rem;"
        >
          <!-- User message -->
          <div v-if="msg.role === 'user'" style="text-align: right;">
            <span
              style="
                display: inline-block;
                max-width: 80%;
                padding: 0.5rem 0.75rem;
                background: #1e3a5f;
                border-radius: 8px;
                white-space: pre-wrap;
                word-break: break-word;
              "
            >{{ msg.text }}</span>
          </div>

          <!-- Assistant message -->
          <div v-else-if="msg.role === 'assistant'" style="text-align: left;">
            <span
              style="
                display: inline-block;
                max-width: 80%;
                padding: 0.5rem 0.75rem;
                background: #1e3020;
                border-radius: 8px;
                white-space: pre-wrap;
                word-break: break-word;
              "
            >{{ msg.text }}</span>
          </div>

          <!-- Error message -->
          <div
            v-else
            style="
              color: #f99;
              font-size: 0.875rem;
              display: flex;
              align-items: center;
              gap: 0.5rem;
            "
          >
            <span>{{ msg.text }}</span>
            <button
              style="font-size: 0.8rem; padding: 0.2rem 0.5rem; cursor: pointer;"
              :disabled="chat.busy.value"
              @click="retryLastQuestion(i)"
            >
              Retry
            </button>
          </div>
        </div>

        <!-- Live streaming bubble -->
        <div v-if="chat.busy.value && chat.currentStream.value" style="text-align: left; margin-bottom: 0.75rem;">
          <span
            style="
              display: inline-block;
              max-width: 80%;
              padding: 0.5rem 0.75rem;
              background: #1e3020;
              border-radius: 8px;
              white-space: pre-wrap;
              word-break: break-word;
            "
          >{{ chat.currentStream.value }}</span>
        </div>

        <!-- Pre-stream wait indicator -->
        <div
          v-if="chat.busy.value && !chat.currentStream.value"
          style="color: #9097a6; margin-bottom: 0.75rem; font-size: 1.25rem; letter-spacing: 0.1em;"
        >
          …
        </div>

        <!-- Conversation cap notice -->
        <div
          v-if="chat.atCap.value"
          style="color: #9097a6; font-size: 0.875rem; margin-bottom: 0.75rem;"
        >
          Conversation limit reached — analyze another document to continue.
        </div>

        <!-- Composer -->
        <div
          v-if="!chat.atCap.value"
          style="display: flex; gap: 0.5rem; align-items: flex-end;"
        >
          <textarea
            v-model="questionInput"
            :disabled="chat.busy.value"
            placeholder="Ask a question… (Ctrl+Enter to send)"
            rows="3"
            style="
              flex: 1;
              resize: vertical;
              min-height: 60px;
              padding: 0.5rem;
              font-family: inherit;
              font-size: 1rem;
              background: #111;
              color: inherit;
              border: 1px solid #333;
              border-radius: 4px;
            "
            @keydown.ctrl.enter.prevent="sendQuestion"
          />
          <button
            :disabled="chat.busy.value || !questionInput.trim()"
            style="padding: 0.5rem 1rem; align-self: flex-end; cursor: pointer;"
            @click="sendQuestion"
          >
            Send
          </button>
        </div>
      </div>

      <!-- Reset -->
      <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #222;">
        <button style="cursor: pointer;" @click="resetAll">
          Analyze another document
        </button>
      </div>
    </template>
  </div>
</template>
