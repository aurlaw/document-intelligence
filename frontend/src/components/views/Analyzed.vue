<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { DocumentAnalysis } from '../../types'
import type { ChatMessage } from '../../composables/useDocumentChat'
import Wordmark from '../Wordmark.vue'
import Icon from '../Icon.vue'
import SectionLabel from '../SectionLabel.vue'
import EntityGroup from '../EntityGroup.vue'
import SuggestedQuestions from '../SuggestedQuestions.vue'
import ChatMessage_ from '../ChatMessage.vue'
import TypingIndicator from '../TypingIndicator.vue'
import ChatError from '../ChatError.vue'

const props = defineProps<{
  source: { name: string; size?: string; mode: 'paste' | 'file' }
  analysis: DocumentAnalysis
  messages: ChatMessage[]
  currentStream: string
  busy: boolean
  atCap: boolean
}>()

const emit = defineEmits<{
  reset: []
  ask: [question: string]
  retryChat: [msgIndex: number]
}>()

const chatInput = ref('')
const threadEl = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (threadEl.value) {
      threadEl.value.scrollTop = threadEl.value.scrollHeight
    }
  })
}

watch(() => props.messages.length, scrollToBottom)
watch(() => props.currentStream, scrollToBottom)
watch(() => props.busy, (val) => { if (val) scrollToBottom() })

async function sendQuestion() {
  const q = chatInput.value.trim()
  if (!q || props.busy || props.atCap) return
  chatInput.value = ''
  emit('ask', q)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendQuestion()
  }
}

function sendSuggested(q: string) {
  if (props.busy || props.atCap) return
  emit('ask', q)
}

const ENTITY_DELAYS: Record<string, number> = {
  people: 120,
  organizations: 170,
  dates: 220,
  topics: 270,
}
</script>

<template>
  <div class="min-h-screen">

    <!-- Sticky collapsed header -->
    <header class="sticky top-0 z-20 border-b border-line2 bg-panel/90 backdrop-blur-md">
      <div class="max-w-2xl mx-auto px-5 sm:px-6 py-3 flex items-center gap-3 min-w-0">
        <Wordmark :small="true" class="shrink-0" />
        <span class="text-line2 text-sm shrink-0">|</span>
        <span class="font-mono text-xs text-faint truncate flex-1 min-w-0">{{ source.name }}</span>
        <span v-if="source.size" class="font-mono text-xs text-faint shrink-0 hidden sm:inline">
          {{ source.size }}
        </span>
        <span
          v-if="analysis.documentType"
          class="font-mono text-xs px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accentSoft shrink-0 truncate max-w-[160px] hidden sm:inline-block"
        >
          {{ analysis.documentType.toUpperCase() }}
        </span>
        <button
          class="ml-auto shrink-0 flex items-center gap-1.5 text-xs text-faint hover:text-muted transition-colors"
          aria-label="Analyze another document"
          @click="emit('reset')"
        >
          <Icon name="refresh" :size="13" />
          <span class="hidden sm:inline">Analyze another</span>
        </button>
      </div>
    </header>

    <!-- Main content -->
    <div class="max-w-2xl mx-auto px-5 sm:px-6 py-8 space-y-10">

      <!-- 01 Summary -->
      <section class="rise" style="animation-delay: 0ms">
        <SectionLabel n="01" title="Summary">
          <template #right>
            <span class="font-mono text-xs text-faint">
              <template v-if="analysis.confidence !== undefined">{{ analysis.confidence }}% conf</template>
              <template v-if="analysis.confidence !== undefined && analysis.pageCount"> &middot; </template>
              <template v-if="analysis.pageCount">{{ analysis.pageCount }} pp</template>
            </span>
          </template>
        </SectionLabel>
        <p class="mt-3 text-sm text-muted leading-relaxed">{{ analysis.summary }}</p>
      </section>

      <!-- 02 Key entities -->
      <section class="rise" style="animation-delay: 80ms">
        <SectionLabel n="02" title="Key entities" />
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <EntityGroup
            v-if="analysis.keyEntities.people.length"
            cat="people"
            :items="analysis.keyEntities.people"
            :delay="ENTITY_DELAYS.people"
          />
          <EntityGroup
            v-if="analysis.keyEntities.organizations.length"
            cat="organizations"
            :items="analysis.keyEntities.organizations"
            :delay="ENTITY_DELAYS.organizations"
          />
          <EntityGroup
            v-if="analysis.keyEntities.dates.length"
            cat="dates"
            :items="analysis.keyEntities.dates"
            :delay="ENTITY_DELAYS.dates"
          />
          <EntityGroup
            v-if="analysis.keyEntities.topics.length"
            cat="topics"
            :items="analysis.keyEntities.topics"
            :delay="ENTITY_DELAYS.topics"
          />
        </div>
      </section>

      <!-- 03 Suggested questions -->
      <section v-if="analysis.suggestedQuestions.length" class="rise" style="animation-delay: 160ms">
        <SectionLabel n="03" title="Suggested questions" />
        <div class="mt-3">
          <SuggestedQuestions
            :items="analysis.suggestedQuestions"
            :disabled="busy || atCap"
            @ask="sendSuggested"
          />
        </div>
      </section>

      <!-- 04 Ask the document -->
      <section class="rise" style="animation-delay: 220ms">
        <SectionLabel n="04" title="Ask the document" />
        <p class="mt-2 text-xs text-faint">
          Ask anything about this document — clauses, parties, dates, obligations.
        </p>

        <!-- Chat thread -->
        <div
          ref="threadEl"
          class="mt-4 space-y-4 max-h-[52vh] overflow-y-auto pr-1"
          aria-live="polite"
          aria-label="Conversation"
        >
          <template v-for="(msg, i) in messages" :key="i">
            <ChatMessage_
              v-if="msg.role === 'user' || msg.role === 'assistant'"
              :role="msg.role"
              :text="msg.text"
            />
            <ChatError
              v-else-if="msg.role === 'error'"
              :message="msg.text"
              @retry="emit('retryChat', i)"
            />
          </template>

          <!-- Pre-stream wait -->
          <TypingIndicator v-if="busy && !currentStream" />

          <!-- Live streaming bubble -->
          <ChatMessage_
            v-if="busy && currentStream"
            role="assistant"
            :text="currentStream"
            :streaming="true"
          />
        </div>

        <!-- Conversation cap notice -->
        <p v-if="atCap" class="mt-3 text-xs text-faint text-center">
          Conversation limit reached — analyze another document to continue.
        </p>

        <!-- Composer -->
        <div
          v-if="!atCap"
          class="mt-4 focusring flex items-center gap-2 rounded-xl border border-line2 bg-panel2 px-4 py-3"
        >
          <input
            v-model="chatInput"
            :disabled="busy"
            type="text"
            placeholder="Ask about a clause, a party, a date…"
            class="flex-1 bg-transparent text-sm text-fg placeholder-faint outline-none min-w-0 disabled:opacity-50"
            @keydown="handleKeydown"
          />
          <button
            :disabled="busy || !chatInput.trim()"
            class="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-accent text-white transition-all hover:bg-accentSoft active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-accent disabled:active:scale-100"
            aria-label="Send"
            @click="sendQuestion"
          >
            <Icon name="send" :size="13" />
          </button>
        </div>

        <!-- Session trust note -->
        <p class="mt-3 text-center text-xs text-faint">
          This conversation lives only in your session and is discarded when you analyze another document.
        </p>
      </section>

    </div>
  </div>
</template>
