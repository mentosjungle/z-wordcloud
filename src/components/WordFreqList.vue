<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import type { WordFrequency } from '../types'
import type { DataMode } from '../utils/freqHelpers'
import { clampWeight, ensurePositiveInt } from '../utils/freqHelpers'

const props = defineProps<{
  frequencies: WordFrequency[]
  maxDisplay: number
  dataMode: DataMode
}>()

const emit = defineEmits<{
  updateList: [list: WordFrequency[]]
  modeChange: [mode: DataMode]
}>()

// 本地克隆数据，避免直接修改 prop
const localList = ref<WordFrequency[]>([])

// 编辑状态（必须在 watch 之前声明，因为 watch immediate 会引用）
const editingRow = ref<string | null>(null)
const editingField = ref<'word' | 'count' | null>(null)
const editValue = ref('')

// 删除动画
const deletingWords = ref<Set<string>>(new Set())

// 高亮（重复词定位）
const highlightWord = ref<string | null>(null)

watch(
  () => props.frequencies,
  (val) => {
    // 编辑过程中不同步外部数据，避免打断用户输入
    if (editingRow.value) return
    localList.value = val.map((v) => ({ ...v }))
  },
  { immediate: true },
)

const expanded = ref(false)

const displayList = computed(() => {
  if (expanded.value) return localList.value
  return localList.value.slice(0, props.maxDisplay)
})

const maxCount = computed(() => {
  if (localList.value.length === 0) return 1
  if (props.dataMode === 'weight') return 100
  return localList.value[0].count
})

// debounce timer
let emitTimer: ReturnType<typeof setTimeout> | null = null

onUnmounted(() => {
  if (emitTimer) clearTimeout(emitTimer)
})

function debouncedEmit() {
  if (emitTimer) clearTimeout(emitTimer)
  emitTimer = setTimeout(() => {
    emit('updateList', localList.value.map((v) => ({ ...v })))
  }, 300)
}

function startEdit(item: WordFrequency, field: 'word' | 'count') {
  editingRow.value = item.word
  editingField.value = field
  editValue.value = field === 'word' ? item.word : String(item.count)
  nextTick(() => {
    const el = document.querySelector(
      `[data-edit="${field}-${CSS.escape(item.word)}"]`,
    ) as HTMLInputElement | null
    el?.focus()
    if (field === 'word') el?.select()
  })
}

function confirmEdit(item: WordFrequency) {
  if (!editingRow.value || !editingField.value) return
  const field = editingField.value

  if (field === 'word') {
    const newWord = editValue.value.trim()
    if (!newWord || newWord === item.word) {
      cancelEdit()
      return
    }
    const existingIndex = localList.value.findIndex((w) => w.word === newWord)
    if (existingIndex !== -1) {
      // 合并到已有词：数值累加当前项的 count
      const existing = localList.value[existingIndex]
      existing.count += item.count
      if (props.dataMode === 'weight') {
        existing.count = clampWeight(existing.count)
      }
      // 删除当前项
      const idx = localList.value.findIndex((w) => w.word === item.word)
      if (idx !== -1) {
        localList.value.splice(idx, 1)
      }
      highlightWord.value = newWord
      setTimeout(() => (highlightWord.value = null), 1500)
    } else {
      item.word = newWord
    }
  } else {
    const num = parseFloat(editValue.value)
    if (isNaN(num)) {
      cancelEdit()
      return
    }
    if (props.dataMode === 'frequency') {
      item.count = ensurePositiveInt(num)
    } else {
      item.count = clampWeight(num)
    }
  }

  editingRow.value = null
  editingField.value = null
  debouncedEmit()
}

function cancelEdit() {
  editingRow.value = null
  editingField.value = null
}

function handleKeydown(e: KeyboardEvent, item: WordFrequency) {
  if (e.key === 'Enter') {
    e.preventDefault()
    confirmEdit(item)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelEdit()
  } else if (e.key === 'Tab' && editingField.value === 'word') {
    e.preventDefault()
    confirmEdit(item)
    nextTick(() => startEdit(item, 'count'))
  }
}

function handleDelete(item: WordFrequency) {
  deletingWords.value.add(item.word)
  setTimeout(() => {
    const idx = localList.value.findIndex((w) => w.word === item.word)
    if (idx !== -1) {
      localList.value.splice(idx, 1)
      debouncedEmit()
    }
    deletingWords.value.delete(item.word)
  }, 250)
}

function switchMode(mode: DataMode) {
  if (mode === props.dataMode) return
  cancelEdit()
  emit('modeChange', mode)
}

// --- 幽灵行 ---
const ghostWord = ref('')
const ghostCount = ref('')
const ghostFocus = ref<'word' | 'count' | null>(null)

function handleGhostAdd() {
  const word = ghostWord.value.trim()
  if (!word) return

  let count: number
  if (props.dataMode === 'frequency') {
    count = ghostCount.value
      ? ensurePositiveInt(parseFloat(ghostCount.value))
      : 1
  } else {
    count = ghostCount.value
      ? clampWeight(parseFloat(ghostCount.value))
      : 50
  }

  const existingIndex = localList.value.findIndex((w) => w.word === word)
  if (existingIndex !== -1) {
    const existing = localList.value[existingIndex]
    if (props.dataMode === 'frequency') {
      existing.count += ghostCount.value ? count : 1
    } else {
      existing.count = clampWeight(existing.count + (ghostCount.value ? count : 5))
    }
    highlightWord.value = word
    setTimeout(() => (highlightWord.value = null), 1500)
  } else {
    localList.value.push({ word, count })
  }

  ghostWord.value = ''
  ghostCount.value = ''
  debouncedEmit()

  nextTick(() => {
    const el = document.querySelector(
      '[data-ghost="word"]',
    ) as HTMLInputElement | null
    el?.focus()
  })
}

function handleGhostKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab' && ghostFocus.value === 'word') {
    e.preventDefault()
    const el = document.querySelector(
      '[data-ghost="count"]',
    ) as HTMLInputElement | null
    el?.focus()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    handleGhostAdd()
  }
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-medium text-slate-700">词频列表</h2>
        <!-- 模式切换 -->
        <div class="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            @click="switchMode('frequency')"
            class="px-2 py-0.5 text-[11px] rounded-md transition"
            :class="
              dataMode === 'frequency'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            "
          >
            词频
          </button>
          <button
            @click="switchMode('weight')"
            class="px-2 py-0.5 text-[11px] rounded-md transition"
            :class="
              dataMode === 'weight'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            "
          >
            权重
          </button>
        </div>
      </div>
      <span class="text-xs text-slate-400">共 {{ frequencies.length }} 个词</span>
    </div>

    <!-- List -->
    <div class="max-h-[320px] overflow-y-auto">
      <div
        v-for="(item, index) in displayList"
        :key="item.word"
        class="group flex items-center gap-2.5 px-4 transition-all duration-200 overflow-hidden"
        :class="[
          deletingWords.has(item.word)
            ? 'opacity-0 max-h-0 py-0'
            : 'opacity-100 max-h-10 py-1.5',
          highlightWord === item.word
            ? 'bg-amber-50'
            : 'hover:bg-slate-50',
        ]"
      >
        <span class="text-[10px] text-slate-400 w-5 text-right tabular-nums flex-shrink-0">{{ index + 1 }}</span>

        <!-- Word -->
        <input
          v-if="editingRow === item.word && editingField === 'word'"
          :data-edit="`word-${item.word}`"
          v-model="editValue"
          type="text"
          class="w-16 text-xs text-slate-700 bg-white border border-indigo-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 flex-shrink-0"
          @blur="confirmEdit(item)"
          @keydown="handleKeydown($event, item)"
        />
        <span
          v-else
          class="text-xs text-slate-700 w-16 truncate flex-shrink-0 cursor-pointer select-none"
          :title="item.word"
          @click="startEdit(item, 'word')"
        >
          {{ item.word }}
        </span>

        <!-- Progress Bar -->
        <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :class="dataMode === 'weight' ? 'bg-emerald-400' : 'bg-indigo-400'"
            :style="{ width: (item.count / maxCount * 100) + '%' }"
          ></div>
        </div>

        <!-- Count -->
        <input
          v-if="editingRow === item.word && editingField === 'count'"
          :data-edit="`count-${item.word}`"
          v-model="editValue"
          type="number"
          class="w-10 text-[10px] text-slate-700 text-right bg-white border border-indigo-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 tabular-nums flex-shrink-0"
          @blur="confirmEdit(item)"
          @keydown="handleKeydown($event, item)"
        />
        <span
          v-else
          class="text-[10px] text-slate-400 tabular-nums w-8 text-right flex-shrink-0 cursor-pointer select-none"
          @click="startEdit(item, 'count')"
        >
          {{ item.count }}
        </span>

        <!-- Delete -->
        <button
          @click="handleDelete(item)"
          class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition flex-shrink-0"
          title="删除此词"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Expand / Collapse -->
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

    <!-- Ghost Row -->
    <div class="px-4 py-2.5 border-t border-dashed border-slate-200 bg-slate-50/50">
      <div class="flex items-center gap-2.5">
        <span class="text-[10px] text-slate-300 w-5 text-right flex-shrink-0">+</span>
        <input
          data-ghost="word"
          v-model="ghostWord"
          type="text"
          placeholder="词名"
          class="w-16 text-xs text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-indigo-400 placeholder:text-slate-300 flex-shrink-0"
          @focus="ghostFocus = 'word'"
          @keydown="handleGhostKeydown"
        />
        <div class="flex-1"></div>
        <input
          data-ghost="count"
          v-model="ghostCount"
          type="number"
          :placeholder="dataMode === 'frequency' ? '1' : '50'"
          class="w-10 text-[10px] text-slate-700 text-right bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-indigo-400 placeholder:text-slate-300 tabular-nums flex-shrink-0"
          @focus="ghostFocus = 'count'"
          @keydown="handleGhostKeydown"
        />
        <button
          @click="handleGhostAdd"
          class="text-slate-400 hover:text-indigo-600 transition flex-shrink-0"
          title="添加"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
  appearance: none;
}
</style>
