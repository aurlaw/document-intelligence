<script setup lang="ts">
import Icon from './Icon.vue'

defineProps<{
  level: 'warn' | 'error'
  label: string
  message: string
  shake?: boolean
}>()
</script>

<template>
  <div
    :class="[
      'rounded-lg border px-4 py-3 flex gap-3 items-start',
      shake ? 'shake' : '',
      level === 'error'
        ? 'bg-panel border-danger/30'
        : 'bg-panel border-warn/30',
    ]"
    role="alert"
  >
    <Icon
      name="alert-triangle"
      :size="16"
      :class="['shrink-0 mt-0.5', level === 'error' ? 'text-danger' : 'text-warn']"
    />
    <div class="min-w-0">
      <div
        class="font-mono text-xs font-medium tracking-widest mb-1"
        :class="level === 'error' ? 'text-danger' : 'text-warn'"
      >
        {{ label }}
      </div>
      <div class="text-sm text-muted leading-snug">{{ message }}</div>
    </div>
  </div>
</template>
