<script setup lang="ts">
import Icon from './Icon.vue'
import type { EntityItem } from '../types'

const props = defineProps<{
  cat: 'people' | 'organizations' | 'dates' | 'topics'
  items: EntityItem[]
  delay?: number
}>()

const CAT_META = {
  people: {
    label: 'PEOPLE',
    icon: 'people',
    color: 'text-violet-400',
    chipBg: 'bg-violet-950/50 border-violet-800/30',
    tagBg: 'bg-violet-900/40 text-violet-300',
  },
  organizations: {
    label: 'ORGANIZATIONS',
    icon: 'building',
    color: 'text-blue-400',
    chipBg: 'bg-blue-950/50 border-blue-800/30',
    tagBg: 'bg-blue-900/40 text-blue-300',
  },
  dates: {
    label: 'DATES',
    icon: 'calendar',
    color: 'text-amber-400',
    chipBg: 'bg-amber-950/50 border-amber-800/30',
    tagBg: 'bg-amber-900/40 text-amber-300',
  },
  topics: {
    label: 'TOPICS',
    icon: 'tag',
    color: 'text-teal-400',
    chipBg: 'bg-teal-950/50 border-teal-800/30',
    tagBg: 'bg-teal-900/40 text-teal-300',
  },
} as const

const meta = CAT_META[props.cat]
</script>

<template>
  <div class="rise" :style="{ animationDelay: `${delay ?? 0}ms` }">
    <div class="flex items-center gap-2 mb-2.5">
      <Icon :name="meta.icon" :size="14" :class="meta.color" />
      <span class="font-mono text-xs tracking-widest" :class="meta.color">
        {{ meta.label }}
      </span>
      <span class="font-mono text-xs text-faint ml-0.5">{{ items.length }}</span>
    </div>
    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="item in items"
        :key="item.value"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm border text-fg"
        :class="meta.chipBg"
      >
        {{ item.value }}
        <span
          v-if="item.label"
          class="font-mono text-xs px-1.5 py-0.5 rounded"
          :class="meta.tagBg"
        >{{ item.label }}</span>
      </span>
    </div>
  </div>
</template>
