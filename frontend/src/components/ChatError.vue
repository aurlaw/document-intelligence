<script setup lang="ts">
defineProps<{
  message: string
  retrying?: boolean
}>()

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="flex flex-col items-start gap-1">
    <div class="flex items-center gap-1.5">
      <span class="inline-block w-1.5 h-1.5 rounded-full bg-danger shrink-0" aria-hidden="true" />
      <span class="font-mono text-xs text-danger">DOCINTEL</span>
    </div>
    <div class="shake max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-danger/10 border border-danger/25 flex items-start gap-3">
      <div class="min-w-0">
        <p class="text-sm text-danger/80 leading-snug">{{ message }}</p>
        <button
          :disabled="retrying"
          class="mt-2 text-xs font-mono text-danger/70 hover:text-danger underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="emit('retry')"
        >
          {{ retrying ? 'Retrying…' : 'Try again' }}
        </button>
      </div>
    </div>
  </div>
</template>
