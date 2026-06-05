<script setup lang="ts">
import { ref } from "vue";
import { ACCEPT_ATTR } from "document-intelligence-shared";
import { useDocumentInput } from "../composables/useDocumentInput";
import type { AnalyzePayload } from "../composables/useDocumentInput";

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ submit: [payload: AnalyzePayload] }>();

const {
  text,
  file,
  counterState,
  counterDisplay,
  validationError,
  isSubmitDisabled,
  setText,
  setFile,
  clearFile,
  trySubmit,
  buildPayload,
} = useDocumentInput();

const fileInputEl = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

function handleTextInput(e: Event) {
  setText((e.target as HTMLTextAreaElement).value);
}

function handleFileInput(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) setFile(f);
  // reset so the same file can be re-selected after clearing
  (e.target as HTMLInputElement).value = "";
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false;
  const f = e.dataTransfer?.files[0];
  if (f) setFile(f);
}

function handleBrowse() {
  fileInputEl.value?.click();
}

async function handleAnalyze() {
  if (props.disabled) return;
  if (!trySubmit()) return;
  const payload = await buildPayload();
  emit("submit", payload);
}
</script>

<template>
  <div
    :style="{
      border: isDragOver ? '2px dashed #356bff' : '1px solid #2c313d',
      borderRadius: '6px',
      padding: '1rem',
      background: isDragOver ? '#0e1018' : '#13161f',
      transition: 'border-color 0.15s, background 0.15s',
    }"
    @dragover.prevent="isDragOver = true"
    @dragleave.prevent="isDragOver = false"
    @drop.prevent="handleDrop"
  >
    <!-- File mode: show filename and remove button -->
    <div v-if="file" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
      <span style="color: #e9ebf2;">📄 {{ file.name }}</span>
      <button
        type="button"
        @click="clearFile"
        style="font-size: 0.8rem; padding: 0.1rem 0.5rem; cursor: pointer;"
      >
        Remove
      </button>
    </div>

    <!-- Text mode: textarea -->
    <textarea
      v-else
      :value="text"
      @input="handleTextInput"
      placeholder="Paste your document text here, or drag and drop a file…"
      rows="6"
      :disabled="disabled"
      style="
        width: 100%;
        box-sizing: border-box;
        resize: vertical;
        font-family: inherit;
        background: #080910;
        color: #e9ebf2;
        border: 1px solid #22262f;
        border-radius: 4px;
        padding: 0.5rem;
        font-size: 0.9rem;
      "
    />

    <!-- Character counter (text mode only) -->
    <div
      v-if="!file"
      :style="{
        fontSize: '0.78rem',
        marginTop: '0.3rem',
        color:
          counterState === 'over' ? '#f55' :
          counterState === 'near' ? '#f90' :
          '#626a79',
      }"
    >
      {{ counterDisplay }}
      <span v-if="counterState === 'near'"> — nearing limit</span>
    </div>

    <!-- File browse button (text or empty mode) -->
    <input
      ref="fileInputEl"
      type="file"
      :accept="ACCEPT_ATTR"
      style="display: none"
      @change="handleFileInput"
    />
    <div v-if="!file" style="margin-top: 0.5rem;">
      <button
        type="button"
        :disabled="disabled"
        @click="handleBrowse"
        style="font-size: 0.85rem; padding: 0.25rem 0.75rem; cursor: pointer;"
      >
        Attach file
      </button>
      <span style="color: #626a79; font-size: 0.8rem; margin-left: 0.5rem;">
        or drag and drop (PDF, PNG, JPG, WebP, TXT, MD, CSV — max 2 MB)
      </span>
    </div>

    <!-- Validation error / warning -->
    <div
      v-if="validationError"
      :style="{
        marginTop: '0.6rem',
        padding: '0.5rem 0.75rem',
        borderRadius: '4px',
        background: validationError.level === 'error' ? '#2a0e0e' : '#2a2505',
        color: validationError.level === 'error' ? '#f99' : '#f0c040',
        border: validationError.level === 'error' ? '1px solid #6b1e1e' : '1px solid #5a4a10',
        fontSize: '0.875rem',
      }"
    >
      {{ validationError.message }}
    </div>

    <!-- Analyze button -->
    <div style="margin-top: 0.75rem;">
      <button
        type="button"
        :disabled="isSubmitDisabled || disabled"
        @click="handleAnalyze"
        style="padding: 0.4rem 1.4rem; font-size: 0.95rem; cursor: pointer;"
      >
        Analyze
      </button>
    </div>
  </div>
</template>
