<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAnalyze } from './composables/useAnalyze'
import { useDocumentChat } from './composables/useDocumentChat'
import type { AnalyzePayload } from './composables/useDocumentInput'
import EmptyState from './components/views/EmptyState.vue'
import Analyzing from './components/views/Analyzing.vue'
import FailedAnalysis from './components/views/FailedAnalysis.vue'
import Analyzed from './components/views/Analyzed.vue'
import sampleText from './assets/sample.txt?raw'

type Source = { name: string; size?: string; mode: 'paste' | 'file' }

const { analysis, doc, loading, error, analyze, reset: resetAnalyze } = useAnalyze()
const chat = useDocumentChat()

const steps = ref(0)
const source = ref<Source>({ name: '', mode: 'paste' })
const lastPayload = ref<AnalyzePayload | null>(null)

const phase = computed(() => {
  if (loading.value) return 'analyzing'
  if (analysis.value) return 'analyzed'
  if (error.value) return 'failed'
  return 'empty'
})

// Advance the analyzing step list while loading
let stepsTimer: ReturnType<typeof setInterval> | null = null

watch(loading, (val) => {
  if (val) {
    steps.value = 0
    stepsTimer = setInterval(() => {
      if (steps.value < 2) steps.value++
    }, 1400)
  } else {
    if (stepsTimer) {
      clearInterval(stepsTimer)
      stepsTimer = null
    }
  }
})

async function handleAnalyze(payload: AnalyzePayload, name: string, size?: string) {
  lastPayload.value = payload
  source.value = {
    name,
    size,
    mode: 'fileName' in payload ? 'file' : 'paste',
  }
  chat.reset()
  await analyze(payload)
}

async function handleSample() {
  await handleAnalyze({ text: sampleText }, 'sample-lease.txt')
}

async function handleRetry() {
  if (!lastPayload.value) return
  await analyze(lastPayload.value)
}

function handleRetryChat(msgIndex: number) {
  const msgs = chat.messages.value
  for (let i = msgIndex - 1; i >= 0; i--) {
    if (msgs[i].role === 'user') {
      const q = msgs[i].text
      msgs.splice(msgIndex, 1)
      if (doc.value) chat.ask(doc.value, q)
      return
    }
  }
}

async function handleAsk(question: string) {
  if (chat.busy.value || chat.atCap.value || !doc.value) return
  await chat.ask(doc.value, question)
}

function resetAll() {
  resetAnalyze()
  chat.reset()
}
</script>

<template>
  <div class="relative min-h-screen bg-bg">
    <!-- Ambient background layers -->
    <div class="bg-field fixed inset-0 z-0 pointer-events-none" />
    <div class="bg-grid fixed inset-0 z-0 pointer-events-none" />

    <!-- Phase views -->
    <div class="relative z-10">
      <Transition name="fade" mode="out-in">
        <div :key="phase">
          <EmptyState
            v-if="phase === 'empty'"
            @analyze="handleAnalyze"
            @sample="handleSample"
          />

          <Analyzing
            v-else-if="phase === 'analyzing'"
            :source="source"
            :steps="steps"
          />

          <FailedAnalysis
            v-else-if="phase === 'failed'"
            :source="source"
            :error="error!"
            @retry="handleRetry"
            @reset="resetAll"
          />

          <Analyzed
            v-else-if="phase === 'analyzed'"
            :source="source"
            :analysis="analysis!"
            :messages="chat.messages.value"
            :current-stream="chat.currentStream.value"
            :busy="chat.busy.value"
            :at-cap="chat.atCap.value"
            @reset="resetAll"
            @ask="handleAsk"
            @retry-chat="handleRetryChat"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>
