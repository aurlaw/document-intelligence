<script setup lang="ts">
import Wordmark from '../Wordmark.vue'
import UnifiedInput from '../UnifiedInput.vue'
import Icon from '../Icon.vue'
import Footer from '../Footer.vue'
import type { AnalyzePayload } from '../../composables/useDocumentInput'

defineProps<{ disabled?: boolean }>()

const emit = defineEmits<{
  analyze: [payload: AnalyzePayload, name: string, size?: string]
  sample: []
}>()
</script>

<template>
  <div class="min-h-screen">
    <div class="relative max-w-2xl mx-auto px-5 sm:px-6 pt-12 sm:pt-20 pb-8">

      <!-- Status pill (top right) -->
      <div class="absolute top-8 right-5 sm:right-6 flex items-center gap-1.5">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
        <span class="font-mono text-xs text-faint">session &middot; ephemeral</span>
      </div>

      <!-- Wordmark -->
      <Wordmark class="mb-8" />

      <!-- Eyebrow -->
      <p class="font-mono text-xs tracking-widest text-faint mb-4">DOCUMENT INTELLIGENCE</p>

      <!-- Hero -->
      <h1 class="font-display text-3xl sm:text-4xl font-bold text-fg leading-tight mb-8">
        Drop in a document.<br />
        <span class="text-muted">Get its structure<span class="text-accent">.</span></span>
      </h1>

      <!-- Unified input -->
      <UnifiedInput
        :disabled="disabled"
        @analyze="(payload, name, size) => emit('analyze', payload, name, size)"
      />

      <!-- Sample link -->
      <div class="mt-4 text-center">
        <button
          :disabled="disabled"
          class="text-xs text-faint hover:text-muted transition-colors underline underline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
          @click="emit('sample')"
        >
          Try a sample document
        </button>
      </div>

      <!-- Trust notice -->
      <p class="mt-6 text-center text-xs text-faint leading-relaxed">
        Nothing you paste or upload is stored. Documents and conversations are discarded<br class="hidden sm:inline" />
        the moment you analyze another document or refresh the page.
      </p>

      <!-- How it works explainer -->
      <div class="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="flex flex-col gap-2 p-4 rounded-xl border border-line2 bg-panel">
          <div class="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Icon name="file" :size="14" class="text-accentSoft" />
          </div>
          <p class="text-xs font-medium text-fg">Summary</p>
          <p class="text-xs text-faint leading-snug">
            Get a concise summary with confidence score and page count.
          </p>
        </div>
        <div class="flex flex-col gap-2 p-4 rounded-xl border border-line2 bg-panel">
          <div class="w-7 h-7 rounded-lg bg-violet-900/30 border border-violet-700/30 flex items-center justify-center">
            <Icon name="people" :size="14" class="text-violet-400" />
          </div>
          <p class="text-xs font-medium text-fg">Entities</p>
          <p class="text-xs text-faint leading-snug">
            People, organizations, dates, and topics — extracted and labeled.
          </p>
        </div>
        <div class="flex flex-col gap-2 p-4 rounded-xl border border-line2 bg-panel">
          <div class="w-7 h-7 rounded-lg bg-teal-900/30 border border-teal-700/30 flex items-center justify-center">
            <Icon name="question-mark" :size="14" class="text-teal-400" />
          </div>
          <p class="text-xs font-medium text-fg">Q&amp;A</p>
          <p class="text-xs text-faint leading-snug">
            Ask anything about the document in a stateless ephemeral chat.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  </div>
</template>
