<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WordFrequency } from '../types'

const props = defineProps<{
  frequencies: WordFrequency[]
  maxDisplay: number
}>()

const emit = defineEmits<{
  deleteWord: [word: string]
}>()

const expanded = ref(false)

const displayList = computed(() => {
  if (expanded.value) return props.frequencies
  return props.frequencies.slice(0, props.maxDisplay)
})

const maxCount = computed(() => {
  return props.frequencies.length > 0 ? props.frequencies[0].count : 1
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
      <h2 class="text-sm font-medium text-slate-700">词频列表</h2>
      <span class="text-xs text-slate-400">共 {{ frequencies.length }} 个词</span>
    </div>
    <div class="max-h-[320px] overflow-y-auto">
      <div
        v-for="(item, index) in displayList"
        :key="item.word"
        class="group flex items-center gap-2.5 px-4 py-1.5 hover:bg-slate-50 transition"
      >
        <span class="text-[10px] text-slate-400 w-5 text-right tabular-nums flex-shrink-0">{{ index + 1 }}</span>
        <span class="text-xs text-slate-700 w-16 truncate flex-shrink-0" :title="item.word">{{ item.word }}</span>
        <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-indigo-400 rounded-full transition-all"
            :style="{ width: (item.count / maxCount * 100) + '%' }"
          ></div>
        </div>
        <span class="text-[10px] text-slate-400 tabular-nums w-8 text-right flex-shrink-0">{{ item.count }}</span>
        <button
          @click="emit('deleteWord', item.word)"
          class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition flex-shrink-0"
          title="删除此词"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
    <div
      v-if="frequencies.length > maxDisplay"
      class="px-4 py-2 border-t border-slate-100 text-center"
    >
      <button
        @click="expanded = !expanded"
        class="text-xs text-indigo-600 hover:text-indigo-700 transition"
      >
        {{ expanded ? '收起' : `显示全部 ${frequencies.length} 个词` }}
      </button>
    </div>
  </div>
</template>
