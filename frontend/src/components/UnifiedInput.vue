<script setup lang="ts">
import { ref } from 'vue'
import { ACCEPT_ATTR } from 'document-intelligence-shared'
import { useDocumentInput } from '../composables/useDocumentInput'
import type { AnalyzePayload } from '../composables/useDocumentInput'
import Icon from './Icon.vue'
import ValidationNote from './ValidationNote.vue'

const props = defineProps<{ disabled?: boolean }>()

const emit = defineEmits<{
  analyze: [payload: AnalyzePayload, name: string, size?: string]
}>()

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
} = useDocumentInput()

const fileInputEl = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const shakeNote = ref(false)

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

function handleTextInput(e: Event) {
  setText((e.target as HTMLTextAreaElement).value)
}

function handleFileInput(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) setFile(f)
  ;(e.target as HTMLInputElement).value = ''
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false
  const f = e.dataTransfer?.files[0]
  if (f) setFile(f)
}

function handleBrowse() {
  fileInputEl.value?.click()
}

async function handleAnalyze() {
  if (props.disabled) return
  if (!trySubmit()) {
    triggerShake()
    return
  }
  const payload = await buildPayload()
  const name = file.value ? file.value.name : 'pasted text'
  const size = file.value ? formatBytes(file.value.size) : undefined
  emit('analyze', payload, name, size)
}

function triggerShake() {
  shakeNote.value = false
  requestAnimationFrame(() => { shakeNote.value = true })
  setTimeout(() => { shakeNote.value = false }, 600)
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    handleAnalyze()
  }
}

const validationLabelMap: Record<string, string> = {
  empty: 'NOTHING TO ANALYZE',
  over: 'TEXT OVER LIMIT',
  size: 'FILE TOO LARGE',
  type: 'UNSUPPORTED FORMAT',
}
</script>

<template>
  <div class="space-y-3">
    <!-- Input zone -->
    <div
      class="focusring rounded-xl border border-line2 bg-panel2 overflow-hidden transition-colors"
      :class="isDragOver ? 'border-accent/60 bg-panel' : ''"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="handleDrop"
    >
      <!-- File mode -->
      <div v-if="file" class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2.5 flex-1 min-w-0">
            <div class="shrink-0 w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Icon name="file" :size="14" class="text-accentSoft" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-fg truncate">{{ file.name }}</p>
              <p class="text-xs text-faint">{{ formatBytes(file.size) }}</p>
            </div>
          </div>
          <button
            type="button"
            class="shrink-0 p-1.5 rounded-md text-faint hover:text-fg hover:bg-panel3 transition-colors"
            aria-label="Remove file"
            @click="clearFile"
          >
            <Icon name="x" :size="14" />
          </button>
        </div>
      </div>

      <!-- Text mode -->
      <div v-else>
        <textarea
          :value="text"
          :disabled="disabled"
          placeholder="Paste your document text here…"
          rows="7"
          class="w-full resize-none bg-transparent text-fg placeholder-faint text-sm leading-relaxed p-4 outline-none"
          style="font-family: inherit;"
          @input="handleTextInput"
          @keydown="handleKeydown"
        />

        <!-- Counter + browse row -->
        <div class="flex items-center justify-between px-4 pb-3 gap-4">
          <span
            class="font-mono text-xs"
            :class="{
              'text-danger': counterState === 'over',
              'text-warn': counterState === 'near',
              'text-counter-normal': counterState === 'normal',
            }"
          >
            {{ counterDisplay }}
            <span v-if="counterState === 'near'" class="text-warn/70"> &mdash; nearing limit</span>
          </span>

          <div class="flex items-center gap-2 shrink-0">
            <input
              ref="fileInputEl"
              type="file"
              :accept="ACCEPT_ATTR"
              class="hidden"
              @change="handleFileInput"
            />
            <button
              type="button"
              :disabled="disabled"
              class="flex items-center gap-1.5 text-xs text-faint hover:text-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              @click="handleBrowse"
            >
              <Icon name="upload" :size="13" />
              Attach file
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Drag overlay hint -->
    <p v-if="!file" class="text-center text-xs text-faint">
      PDF, PNG, JPG, WebP, TXT, MD, CSV &mdash; max 2 MB
    </p>

    <!-- Validation note -->
    <Transition name="fade">
      <ValidationNote
        v-if="validationError"
        :level="validationError.level"
        :label="validationLabelMap[validationError.kind] ?? 'INVALID INPUT'"
        :message="validationError.message"
        :shake="shakeNote"
      />
    </Transition>

    <!-- Analyze button -->
    <button
      type="button"
      :disabled="isSubmitDisabled || disabled"
      class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent font-medium text-sm text-white transition-all hover:bg-accentSoft active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent disabled:active:scale-100"
      @click="handleAnalyze"
    >
      Analyze document
      <Icon name="arrow-right" :size="15" />
    </button>
  </div>
</template>
