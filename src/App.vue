<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import WordCloudCanvas from './components/WordCloudCanvas.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import WordFreqList from './components/WordFreqList.vue'
import { initSegmenter, countWordFrequency, addCustomDictWords } from './utils/segmenter'
import { convertFrequencies } from './utils/freqHelpers'
import type { WordFrequency, CloudSettings } from './types'
import type { DataMode } from './utils/freqHelpers'

const text = ref('')
const wordFrequencies = ref<WordFrequency[]>([])
const isGenerating = ref(false)
const isWasmReady = ref(false)
const wasmError = ref('')
const showSettings = ref(true)
const dataMode = ref<DataMode>('frequency')

// Phase 2: 自定义词典 & 停用词
const customDict = ref<string[]>([])
const customStopwords = ref<string[]>([])

const settings = reactive<CloudSettings>({
  maxWords: 200,
  minFontSize: 12,
  maxFontSize: 80,
  colorScheme: 'random',
  shape: 'circle',
  fontFamily: '"Noto Sans SC", "Microsoft YaHei", sans-serif',
  rotateRatio: 0.3,
  backgroundColor: 'transparent',
  maskImage: null,
})

const charCount = computed(() => text.value.length)

onMounted(async () => {
  try {
    await initSegmenter()
    isWasmReady.value = true
  } catch (e) {
    wasmError.value = '分词引擎加载失败，请刷新页面重试'
    console.error('Failed to init jieba-wasm:', e)
  }
})

function generate() {
  if (!text.value.trim() || !isWasmReady.value) return
  isGenerating.value = true
  setTimeout(() => {
    try {
      // 生成前注入自定义词典
      if (customDict.value.length > 0) {
        addCustomDictWords(customDict.value)
      }
      // 构建自定义停用词 Set
      const stopSet = customStopwords.value.length > 0
        ? new Set(customStopwords.value)
        : undefined
      wordFrequencies.value = countWordFrequency(text.value, stopSet)
    } catch (e) {
      console.error('Segmentation failed:', e)
    } finally {
      isGenerating.value = false
    }
  }, 50)
}

function handleClear() {
  text.value = ''
  wordFrequencies.value = []
}

function handleUpdateList(list: WordFrequency[]) {
  wordFrequencies.value = list
}

function handleModeChange(mode: DataMode) {
  if (mode === dataMode.value) return
  wordFrequencies.value = convertFrequencies(wordFrequencies.value, dataMode.value, mode)
  dataMode.value = mode
}

// --- 自定义词典管理 ---
function addDictWord(word: string) {
  if (!customDict.value.includes(word)) {
    customDict.value.push(word)
  }
}
function removeDictWord(word: string) {
  customDict.value = customDict.value.filter(w => w !== word)
}
function clearDict() {
  customDict.value = []
}

// --- 自定义停用词管理 ---
function addStopword(word: string) {
  if (!customStopwords.value.includes(word)) {
    customStopwords.value.push(word)
  }
}
function removeStopword(word: string) {
  customStopwords.value = customStopwords.value.filter(w => w !== word)
}
function clearStopwords() {
  customStopwords.value = []
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
    <!-- Header -->
    <header class="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
      <div class="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 12h10M4 18h14" stroke-linecap="round"/>
            </svg>
          </div>
          <h1 class="text-lg font-semibold text-slate-800 tracking-tight">词云即刻</h1>
          <span class="text-xs text-slate-400 hidden sm:inline">WordCloud Lite</span>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="isWasmReady" class="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">引擎就绪</span>
          <span v-else-if="wasmError" class="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">加载失败</span>
          <span v-else class="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">加载中...</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Left Panel: Input + Settings -->
        <div class="w-full lg:w-[400px] xl:w-[440px] flex-shrink-0 space-y-4">
          <!-- Text Input Card -->
          <div
            class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-opacity"
            :class="dataMode === 'weight' ? 'opacity-50 pointer-events-none' : ''"
          >
            <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 class="text-sm font-medium text-slate-700">输入文本</h2>
              <span class="text-xs text-slate-400">{{ charCount }} 字</span>
            </div>
            <div class="p-4">
              <textarea
                v-model="text"
                class="w-full h-48 resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                placeholder="在此粘贴或输入文本内容...&#10;&#10;支持中文、英文等多种语言。系统将自动进行分词和词频统计，生成精美词云。"
                :disabled="!isWasmReady || dataMode === 'weight'"
              ></textarea>
              <div class="mt-3 flex gap-2">
                <button
                  @click="generate"
                  :disabled="!text.trim() || isGenerating || !isWasmReady || dataMode === 'weight'"
                  class="flex-1 bg-indigo-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  <svg v-if="isGenerating" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  {{ isGenerating ? '生成中...' : '生成词云' }}
                </button>
                <button
                  @click="handleClear"
                  :disabled="!text.trim() && wordFrequencies.length === 0"
                  class="px-4 py-2.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  清空
                </button>
              </div>
            </div>
          </div>

          <!-- Settings Panel -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button
              @click="showSettings = !showSettings"
              class="w-full px-4 py-3 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 class="text-sm font-medium text-slate-700">参数设置</h2>
              <svg
                class="w-4 h-4 text-slate-400 transition-transform"
                :class="{ 'rotate-180': showSettings }"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              >
                <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <SettingsPanel
              v-show="showSettings"
              v-model:settings="settings"
              :custom-dict="customDict"
              :custom-stopwords="customStopwords"
              @add-dict-word="addDictWord"
              @remove-dict-word="removeDictWord"
              @clear-dict="clearDict"
              @add-stopword="addStopword"
              @remove-stopword="removeStopword"
              @clear-stopwords="clearStopwords"
            />
          </div>

          <!-- Word Frequency List -->
          <WordFreqList
            :frequencies="wordFrequencies"
            :max-display="50"
            :data-mode="dataMode"
            @update-list="handleUpdateList"
            @mode-change="handleModeChange"
          />
        </div>

        <!-- Right Panel: Word Cloud Preview -->
        <div class="flex-1 min-w-0">
          <WordCloudCanvas
            :frequencies="wordFrequencies"
            :settings="settings"
            :is-generating="isGenerating"
          />
        </div>
      </div>
    </main>
  </div>
</template>
