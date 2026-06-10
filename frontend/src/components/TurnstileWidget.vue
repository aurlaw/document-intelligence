<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

declare global {
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: Record<string, unknown>): string
      remove(widgetId: string): void
      reset(widgetId: string): void
    }
  }
}

const props = defineProps<{ siteKey: string }>()

const emit = defineEmits<{
  token: [value: string]
  expire: []
  error: []
}>()

const containerEl = ref<HTMLDivElement | null>(null)
let widgetId: string | undefined
let mounted = true

function tryRender() {
  if (!mounted || !containerEl.value || !window.turnstile) return
  widgetId = window.turnstile.render(containerEl.value, {
    sitekey: props.siteKey,
    callback: (token: string) => emit('token', token),
    'expired-callback': () => emit('expire'),
    'error-callback': () => emit('error'),
    theme: 'dark',
    size: 'normal',
  })
}

function reset() {
  if (widgetId && window.turnstile) {
    window.turnstile.reset(widgetId)
  }
}

defineExpose({ reset })

onMounted(() => {
  const poll = () => {
    if (!mounted) return
    if (window.turnstile) {
      tryRender()
    } else {
      setTimeout(poll, 100)
    }
  }
  poll()
})

onUnmounted(() => {
  mounted = false
  if (widgetId && window.turnstile) {
    window.turnstile.remove(widgetId)
  }
})
</script>

<template>
  <div ref="containerEl" />
</template>
