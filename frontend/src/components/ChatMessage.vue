<script setup lang="ts">
defineProps<{
  role: 'user' | 'assistant'
  text: string
  streaming?: boolean
}>()
</script>

<template>
  <!-- User message -->
  <div v-if="role === 'user'" class="flex flex-col items-end gap-1">
    <span class="font-mono text-xs text-faint">YOU</span>
    <div class="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-accent/15 border border-accent/20 text-sm text-fg whitespace-pre-wrap break-words">
      {{ text }}
    </div>
  </div>

  <!-- Assistant message -->
  <div v-else class="flex flex-col items-start gap-1">
    <div class="flex items-center gap-1.5">
      <span class="inline-block w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
      <span class="font-mono text-xs text-faint">DOCINTEL</span>
    </div>
    <div class="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-panel2 border border-line2 text-sm text-fg whitespace-pre-wrap break-words">
      {{ text }}<span v-if="streaming" class="caret text-accentSoft ml-0.5" />
    </div>
  </div>
</template>
