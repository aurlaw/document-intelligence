<script setup lang="ts">
defineProps<{ n: string; title: string }>()
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <span class="font-mono text-xs text-faint">{{ n }}</span>
      <span class="text-sm font-medium text-fg tracking-wide">{{ title }}</span>
    </div>
    <slot name="right" />
  </div>
</template>
