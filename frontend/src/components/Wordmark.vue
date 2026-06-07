<script setup lang="ts">
defineProps<{ small?: boolean }>()
</script>

<template>
  <div :class="['flex items-center', small ? 'gap-1.5' : 'gap-2']">
    <svg
      :width="small ? 18 : 26"
      :height="small ? 18 : 26"
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="26" height="26" rx="5" fill="rgba(53,107,255,0.15)" />
      <path d="M7 6h7a6 6 0 0 1 0 14H7V6z" fill="#356bff" />
    </svg>
    <span
      class="font-display font-bold tracking-tight text-fg"
      :class="small ? 'text-sm' : 'text-xl'"
    >DocIntel</span>
  </div>
</template>
