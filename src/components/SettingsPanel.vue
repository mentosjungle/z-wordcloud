<script setup lang="ts">
import { ref } from 'vue'
import type { CloudSettings } from '../types'
import { colorSchemes } from '../data/colorSchemes'
import TagInput from './TagInput.vue'

const settings = defineModel<CloudSettings>('settings', { required: true })

const props = defineProps<{
  customDict: string[]
  customStopwords: string[]
}>()

const emit = defineEmits<{
  'add-dict-word': [word: string]
  'remove-dict-word': [word: string]
  'clear-dict': []
  'add-stopword': [word: string]
  'remove-stopword': [word: string]
  'clear-stopwords': []
}>()

const shapes = [
  { value: 'circle', label: '圆形' },
  { value: 'cardioid', label: '心形' },
  { value: 'diamond', label: '菱形' },
  { value: 'square', label: '方形' },
  { value: 'triangle-forward', label: '三角形' },
  { value: 'pentagon', label: '五边形' },
  { value: 'star', label: '星形' },
]

// --- Mask image upload ---
const maskPreviewUrl = ref<string | null>(null)

function handleMaskUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    settings.value.maskImage = dataUrl
    maskPreviewUrl.value = dataUrl
  }
  reader.readAsDataURL(file)
}

function removeMask() {
  settings.value.maskImage = null
  maskPreviewUrl.value = null
}

// 初始化预览
if (settings.value.maskImage) {
  maskPreviewUrl.value = settings.value.maskImage
}
</script>

<template>
  <div class="p-4 space-y-5">
    <!-- Custom Dictionary -->
    <TagInput
      title="自定义词典"
      placeholder="输入词汇，逗号或空格分隔"
      description="添加专有名词、品牌名等，确保分词准确识别"
      :words="customDict"
      tag-color="indigo"
      @add="emit('add-dict-word', $event)"
      @remove="emit('remove-dict-word', $event)"
      @clear="emit('clear-dict')"
    />

    <!-- Custom Stopwords -->
    <TagInput
      title="自定义停用词"
      placeholder="输入需屏蔽的词"
      description="添加不想出现在词云中的词汇"
      :words="customStopwords"
      tag-color="red"
      @add="emit('add-stopword', $event)"
      @remove="emit('remove-stopword', $event)"
      @clear="emit('clear-stopwords')"
    />

    <div class="border-t border-slate-100 pt-4">
      <p class="text-[10px] text-slate-400 uppercase tracking-wider mb-3">渲染参数</p>
    </div>

    <!-- Max Words -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <label class="text-xs font-medium text-slate-600">最大词数</label>
        <span class="text-xs text-slate-400 tabular-nums">{{ settings.maxWords }}</span>
      </div>
      <input
        v-model.number="settings.maxWords"
        type="range" min="20" max="500" step="10"
        class="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
      />
      <div class="flex justify-between text-[10px] text-slate-400 mt-0.5">
        <span>20</span><span>500</span>
      </div>
    </div>

    <!-- Font Size Range -->
    <div>
      <label class="text-xs font-medium text-slate-600 block mb-1.5">字号范围</label>
      <div class="flex items-center gap-2">
        <div class="flex-1">
          <input
            v-model.number="settings.minFontSize"
            type="number" min="8" max="40"
            class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          <span class="text-[10px] text-slate-400">最小</span>
        </div>
        <span class="text-slate-300 text-xs">~</span>
        <div class="flex-1">
          <input
            v-model.number="settings.maxFontSize"
            type="number" min="40" max="200"
            class="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          <span class="text-[10px] text-slate-400">最大</span>
        </div>
      </div>
    </div>

    <!-- Shape -->
    <div>
      <label class="text-xs font-medium text-slate-600 block mb-1.5">词云形状</label>
      <div class="grid grid-cols-4 gap-1.5">
        <button
          v-for="shape in shapes"
          :key="shape.value"
          @click="settings.shape = shape.value"
          :disabled="!!settings.maskImage"
          class="px-2 py-1.5 text-[11px] rounded-md border transition"
          :class="[
            settings.maskImage
              ? 'border-slate-100 text-slate-300 cursor-not-allowed'
              : settings.shape === shape.value
                ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
          ]"
        >
          {{ shape.label }}
        </button>
      </div>
      <p v-if="settings.maskImage" class="text-[10px] text-amber-600 mt-1">已上传遮罩图，形状选择已禁用</p>
    </div>

    <!-- Mask Image Upload -->
    <div>
      <label class="text-xs font-medium text-slate-600 block mb-1.5">形状遮罩</label>
      <p class="text-[10px] text-slate-400 mb-1.5">上传图片，词云将按图片深色区域的轮廓排列</p>
      <div v-if="!maskPreviewUrl" class="relative">
        <label
          class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition"
        >
          <svg class="w-6 h-6 text-slate-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span class="text-[11px] text-slate-500">点击上传遮罩图片</span>
          <span class="text-[10px] text-slate-400">PNG / JPG / SVG</span>
          <input type="file" accept="image/*" class="hidden" @change="handleMaskUpload" />
        </label>
      </div>
      <div v-else class="relative group">
        <div class="w-full h-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
          <img :src="maskPreviewUrl" class="max-h-20 max-w-full object-contain" alt="遮罩图预览" />
        </div>
        <button
          @click="removeMask"
          class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
          title="移除遮罩图"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Color Scheme -->
    <div>
      <label class="text-xs font-medium text-slate-600 block mb-1.5">配色方案</label>
      <div class="grid grid-cols-2 gap-1.5">
        <button
          v-for="scheme in colorSchemes"
          :key="scheme.name"
          @click="settings.colorScheme = scheme.name"
          class="flex items-center gap-2 px-2.5 py-2 rounded-md border transition"
          :class="settings.colorScheme === scheme.name
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
        >
          <div class="flex gap-0.5 flex-shrink-0">
            <template v-if="scheme.colors.length > 0">
              <span
                v-for="(color, i) in scheme.colors.slice(0, 4)"
                :key="i"
                class="w-2.5 h-2.5 rounded-full"
                :style="{ backgroundColor: color }"
              ></span>
            </template>
            <template v-else>
              <span class="w-2.5 h-2.5 rounded-full bg-red-400"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-green-400"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
            </template>
          </div>
          <span class="text-[11px]" :class="settings.colorScheme === scheme.name ? 'text-indigo-700 font-medium' : 'text-slate-600'">
            {{ scheme.label }}
          </span>
        </button>
      </div>
    </div>

    <!-- Rotation -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <label class="text-xs font-medium text-slate-600">旋转比例</label>
        <span class="text-xs text-slate-400 tabular-nums">{{ Math.round(settings.rotateRatio * 100) }}%</span>
      </div>
      <input
        v-model.number="settings.rotateRatio"
        type="range" min="0" max="1" step="0.1"
        class="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
      />
    </div>
  </div>
</template>
