<script setup lang="ts">
import Icon from '../Icon.vue'

const props = defineProps<{
  source: { name: string; size?: string; mode: 'paste' | 'file' }
  steps: number
}>()

const STEP_LABELS = ['Reading document', 'Extracting entities', 'Summarizing']

function stepStatus(i: number): 'done' | 'active' | 'pending' {
  if (i < props.steps) return 'done'
  if (i === props.steps) return 'active'
  return 'pending'
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-5">
    <div class="w-full max-w-sm">
      <!-- Card -->
      <div class="rounded-2xl border border-line2 bg-panel overflow-hidden">

        <!-- Card header -->
        <div class="px-6 pt-6 pb-4 border-b border-line2">
          <p class="font-mono text-xs tracking-widest text-faint mb-2">ANALYZING</p>
          <p class="text-sm font-medium text-fg truncate">{{ source.name }}</p>
          <p v-if="source.size" class="font-mono text-xs text-faint mt-0.5">{{ source.size }}</p>
        </div>

        <!-- Steps -->
        <div class="relative">
          <div
            v-for="(label, i) in STEP_LABELS"
            :key="label"
            class="relative flex items-center gap-4 px-6 py-4 overflow-hidden"
            :class="stepStatus(i) === 'active' ? 'bg-accent/5' : ''"
          >
            <!-- Scanline (active row only) -->
            <div
              v-if="stepStatus(i) === 'active'"
              class="scanline absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-accent/60 to-transparent pointer-events-none"
            />

            <!-- Status icon -->
            <div class="shrink-0 w-5 h-5 flex items-center justify-center">
              <Icon
                v-if="stepStatus(i) === 'done'"
                name="check"
                :size="14"
                class="text-accent"
              />
              <span
                v-else-if="stepStatus(i) === 'active'"
                class="inline-block w-2 h-2 rounded-full bg-accent animate-pulse"
              />
              <span
                v-else
                class="inline-block w-1.5 h-1.5 rounded-full bg-line2"
              />
            </div>

            <!-- Label -->
            <span
              class="text-sm"
              :class="{
                'text-muted': stepStatus(i) === 'done',
                'text-fg font-medium': stepStatus(i) === 'active',
                'text-faint': stepStatus(i) === 'pending',
              }"
            >{{ label }}</span>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
