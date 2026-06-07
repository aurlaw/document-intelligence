<script setup lang="ts">
import Icon from './Icon.vue'

defineProps<{
  items: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{ ask: [question: string] }>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
    <button
      v-for="q in items"
      :key="q"
      :disabled="disabled"
      class="group flex items-start gap-3 px-3.5 py-3 rounded-lg border border-line2 bg-panel2 text-left text-sm text-muted hover:border-accent/40 hover:bg-panel3 hover:text-fg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      @click="emit('ask', q)"
    >
      <Icon
        name="question-mark"
        :size="14"
        class="shrink-0 mt-0.5 text-faint group-hover:text-accentSoft transition-colors"
      />
      <span class="flex-1 leading-snug">{{ q }}</span>
      <Icon
        name="arrow-right"
        :size="14"
        class="shrink-0 mt-0.5 text-faint opacity-0 group-hover:opacity-100 group-hover:text-accentSoft transition-all"
      />
    </button>
  </div>
</template>
