<script setup lang="ts">
const props = defineProps<{ name: string; size?: number }>()

const icons: Record<string, string[]> = {
  refresh: ['M4 4v5h.582m15.356 2A8 8 0 1 1 4.582 9m0 0H9'],
  people: [
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
    'M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0',
    'M23 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  building: ['M3 21V7l9-4 9 4v14', 'M9 21v-6h6v6', 'M3 7h18'],
  calendar: ['M3 6h18v16H3V6z', 'M8 2v4', 'M16 2v4', 'M3 10h18'],
  tag: [
    'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z',
    'M7 7h.01',
  ],
  'alert-triangle': [
    'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
    'M12 9v4',
    'M12 17h.01',
  ],
  send: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4 20-7z'],
  'arrow-right': ['M5 12h14', 'M12 5l7 7-7 7'],
  'chevron-right': ['M9 18l6-6-6-6'],
  x: ['M18 6L6 18M6 6l12 12'],
  check: ['M20 6L9 17l-5-5'],
  file: [
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
    'M14 2v6h6',
    'M16 13H8',
    'M16 17H8',
    'M10 9H8',
  ],
  upload: [
    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
    'M17 8l-5-5-5 5',
    'M12 3v12',
  ],
  'info': [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
    'M12 16v-4',
    'M12 8h.01',
  ],
  'question-mark': ['M8 9a4 4 0 1 1 5.66 3.66C12.84 13.38 12 14.1 12 15', 'M12 18h.01'],
}
</script>

<template>
  <svg
    :width="props.size ?? 20"
    :height="props.size ?? 20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, i) in (icons[props.name] ?? [])" :key="i" :d="d" />
  </svg>
</template>
