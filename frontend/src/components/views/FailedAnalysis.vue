<script setup lang="ts">
import Icon from '../Icon.vue'

defineProps<{
  source: { name: string; size?: string; mode: 'paste' | 'file' }
  error: { kind: string; message: string }
}>()

const emit = defineEmits<{
  retry: []
  reset: []
}>()

const ERROR_CODE_MAP: Record<string, string> = {
  network: 'ERR · NETWORK_ERROR',
  timeout: 'ERR · ANALYZE_TIMEOUT',
  rate_limit: 'ERR · RATE_LIMITED',
  server: 'ERR · SERVER_ERROR',
}

function errorCode(kind: string): string {
  return ERROR_CODE_MAP[kind] ?? `ERR · ${kind.toUpperCase().replace(/-/g, '_')}`
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-5">
    <div class="w-full max-w-sm">
      <div class="rounded-2xl border border-danger/30 bg-panel overflow-hidden shake">

        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b border-danger/20 bg-danger/5">
          <div class="flex items-center gap-2 mb-2">
            <Icon name="alert-triangle" :size="14" class="text-danger shrink-0" />
            <p class="font-mono text-xs tracking-widest text-danger">ANALYSIS FAILED</p>
          </div>
          <p class="text-sm font-medium text-fg truncate">{{ source.name }}</p>
          <p v-if="source.size" class="font-mono text-xs text-faint mt-0.5">{{ source.size }}</p>
        </div>

        <!-- Message -->
        <div class="px-6 py-5">
          <p class="text-sm text-muted leading-relaxed">
            The request was valid — this one's on us. Nothing was stored and no
            document data left your session.
          </p>
          <p class="text-xs text-faint mt-2 leading-snug">{{ error.message }}</p>
        </div>

        <!-- Actions -->
        <div class="px-6 pb-5 flex gap-3">
          <button
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent font-medium text-sm text-white transition-all hover:bg-accentSoft active:scale-[0.98]"
            @click="emit('retry')"
          >
            <Icon name="refresh" :size="14" />
            Retry analysis
          </button>
          <button
            class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-line2 text-sm text-muted hover:bg-panel2 hover:text-fg transition-colors"
            @click="emit('reset')"
          >
            Start over
          </button>
        </div>

        <!-- Error code -->
        <div class="px-6 pb-5">
          <p class="font-mono text-xs text-faint/50">{{ errorCode(error.kind) }}</p>
        </div>

      </div>
    </div>
  </div>
</template>
