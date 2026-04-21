<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  title: string
  placeholder: string
  description: string
  words: string[]
  tagColor?: 'indigo' | 'red'
}>()

const emit = defineEmits<{
  add: [word: string]
  remove: [word: string]
  clear: []
}>()

const inputValue = ref('')

function handleAdd() {
  const raw = inputValue.value.trim()
  if (!raw) return
  // 支持用逗号、空格、换行分隔批量输入
  const items = raw.split(/[,，\s\n]+/).filter(Boolean)
  for (const item of items) {
    const trimmed = item.trim()
    if (trimmed && !props.words.includes(trimmed)) {
      emit('add', trimmed)
    }
  }
  inputValue.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleAdd()
  }
}

const tagBg = computed(() => props.tagColor === 'red' ? 'bg-red-50' : 'bg-indigo-50')
const tagText = computed(() => props.tagColor === 'red' ? 'text-red-700' : 'text-indigo-700')
const tagHover = computed(() => props.tagColor === 'red' ? 'hover:bg-red-100' : 'hover:bg-indigo-100')
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-1.5">
      <label class="text-xs font-medium text-slate-600">{{ title }}</label>
      <button
        v-if="words.length > 0"
        @click="emit('clear')"
        class="text-[10px] text-slate-400 hover:text-red-500 transition"
      >
        清空全部
      </button>
    </div>
    <p class="text-[10px] text-slate-400 mb-1.5">{{ description }}</p>
    <div class="flex gap-1.5">
      <input
        v-model="inputValue"
        @keydown="handleKeydown"
        :placeholder="placeholder"
        class="flex-1 min-w-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
      />
      <button
        @click="handleAdd"
        :disabled="!inputValue.trim()"
        class="px-2.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0"
      >
        添加
      </button>
    </div>
    <!-- Tags -->
    <div v-if="words.length > 0" class="flex flex-wrap gap-1 mt-2">
      <span
        v-for="word in words"
        :key="word"
        :class="[tagBg, tagText, tagHover]"
        class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] transition cursor-default group"
      >
        {{ word }}
        <button
          @click="emit('remove', word)"
          class="ml-0.5 opacity-50 group-hover:opacity-100 transition"
        >
          <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </span>
    </div>
  </div>
</template>
