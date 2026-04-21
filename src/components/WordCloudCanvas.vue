<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import WordCloud from 'wordcloud'
import type { WordFrequency, CloudSettings } from '../types'
import { getColorFunction } from '../data/colorSchemes'
import { generateSVG, downloadSVG } from '../utils/svgExport'

const props = defineProps<{
  frequencies: WordFrequency[]
  settings: CloudSettings
  isGenerating: boolean
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const hoveredWord = ref<{ word: string; count: number; x: number; y: number } | null>(null)
const canvasWidth = ref(800)
const canvasHeight = ref(600)
const isSvgExporting = ref(false)

// 词频 -> [word, count] Map 用于 hover 查找
const wordCountMap = new Map<string, number>()

function updateCanvasSize() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    canvasWidth.value = Math.floor(rect.width)
    canvasHeight.value = Math.max(400, Math.floor(rect.width * 0.65))
  }
}

/**
 * 加载遮罩图片，将图片外部区域填充为白色，
 * 返回处理后的 ImageData 绘制到 canvas 上
 */
function loadMaskImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * 在 canvas 上绘制遮罩：深色区域留空（允许放词），浅色/透明区域填白（阻止放词）
 */
function drawMask(canvas: HTMLCanvasElement, img: HTMLImageElement) {
  const ctx = canvas.getContext('2d')!
  const w = canvas.width
  const h = canvas.height

  // 先绘制全白背景
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)

  // 将图片绘制到临时 canvas 获取像素数据
  const tmpCanvas = document.createElement('canvas')
  tmpCanvas.width = w
  tmpCanvas.height = h
  const tmpCtx = tmpCanvas.getContext('2d')!

  // 居中绘制图片，保持比例
  const scale = Math.min(w / img.width, h / img.height)
  const drawW = img.width * scale
  const drawH = img.height * scale
  const offsetX = (w - drawW) / 2
  const offsetY = (h - drawH) / 2
  tmpCtx.drawImage(img, offsetX, offsetY, drawW, drawH)

  const imageData = tmpCtx.getImageData(0, 0, w, h)
  const data = imageData.data

  // 在主 canvas 上：深色像素区域设为透明（wordcloud2 会在这放词），
  // 浅色/透明像素区域保持白色（wordcloud2 会跳过这些区域）
  const mainCtx = ctx
  const mainImageData = mainCtx.getImageData(0, 0, w, h)
  const mainData = mainImageData.data

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    // 计算亮度
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    // 如果像素是深色且不透明 -> 留空（设为透明 = 可以放词）
    if (a > 128 && brightness < 180) {
      mainData[i] = 0
      mainData[i + 1] = 0
      mainData[i + 2] = 0
      mainData[i + 3] = 0
    }
    // 否则保持白色（阻止放词）
  }

  mainCtx.putImageData(mainImageData, 0, 0)
}

async function renderCloud() {
  if (!canvasRef.value || props.frequencies.length === 0) return

  updateCanvasSize()

  await nextTick()
  if (!canvasRef.value) return

  wordCountMap.clear()
  const list: [string, number][] = props.frequencies
    .slice(0, props.settings.maxWords)
    .map(({ word, count }) => {
      wordCountMap.set(word, count)
      return [word, count]
    })

  if (list.length === 0) return

  const maxCount = list[0][1]
  const colorFn = getColorFunction(props.settings.colorScheme)
  const hasMask = !!props.settings.maskImage

  // 如果有遮罩图，先绘制遮罩
  if (hasMask && props.settings.maskImage) {
    try {
      const img = await loadMaskImage(props.settings.maskImage)
      drawMask(canvasRef.value, img)
    } catch (e) {
      console.error('Failed to load mask image:', e)
    }
  }

  WordCloud(canvasRef.value, {
    list,
    gridSize: Math.max(4, Math.round(canvasWidth.value / 120)),
    weightFactor: (size: number) => {
      const normalized = size / maxCount
      return props.settings.minFontSize +
        normalized * (props.settings.maxFontSize - props.settings.minFontSize)
    },
    fontFamily: props.settings.fontFamily,
    color: colorFn,
    backgroundColor: 'transparent',
    rotateRatio: props.settings.rotateRatio,
    minRotation: -Math.PI / 4,
    maxRotation: Math.PI / 4,
    shape: hasMask ? 'square' : props.settings.shape as any,
    clearCanvas: !hasMask, // 有遮罩时不清空 canvas，保留遮罩数据用于碰撞检测
    shrinkToFit: true,
    drawOutOfBound: false,
    hover: (item, dimension, event) => {
      if (item) {
        const word = item[0]
        const count = wordCountMap.get(word) ?? item[1]
        hoveredWord.value = {
          word,
          count,
          x: event.offsetX,
          y: event.offsetY,
        }
      } else {
        hoveredWord.value = null
      }
    },
  })
}

function downloadPNG() {
  if (!canvasRef.value) return
  const link = document.createElement('a')
  link.download = `wordcloud-${Date.now()}.png`
  link.href = canvasRef.value.toDataURL('image/png')
  link.click()
}

async function handleDownloadSVG() {
  if (props.frequencies.length === 0) return
  isSvgExporting.value = true
  try {
    const svg = await generateSVG(
      props.frequencies,
      props.settings,
      canvasWidth.value,
      canvasHeight.value,
    )
    downloadSVG(svg)
  } catch (e) {
    console.error('SVG export failed:', e)
  } finally {
    isSvgExporting.value = false
  }
}

async function copyToClipboard() {
  if (!canvasRef.value) return
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvasRef.value!.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      }, 'image/png')
    })
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  } catch (e) {
    console.error('Copy failed:', e)
  }
}

const copySuccess = ref(false)

// 监听数据和设置变化
watch(
  () => [props.frequencies, props.settings] as const,
  () => {
    if (props.frequencies.length > 0) {
      renderCloud()
    }
  },
  { deep: true }
)

// 响应窗口大小变化
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateCanvasSize()
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateCanvasSize()
      if (props.frequencies.length > 0) {
        renderCloud()
      }
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

defineExpose({ downloadPNG })
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-20">
    <!-- Toolbar -->
    <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-medium text-slate-700">词云预览</h2>
        <span v-if="frequencies.length > 0" class="text-xs text-slate-400">
          {{ frequencies.length }} 个词
        </span>
      </div>
      <div v-if="frequencies.length > 0" class="flex items-center gap-1.5">
        <!-- Copy -->
        <button
          @click="copyToClipboard"
          class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition"
        >
          <svg v-if="!copySuccess" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          <svg v-else class="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {{ copySuccess ? '已复制' : '复制' }}
        </button>
        <!-- Download SVG -->
        <button
          @click="handleDownloadSVG"
          :disabled="isSvgExporting"
          class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 disabled:opacity-50 transition"
        >
          <svg v-if="isSvgExporting" class="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          SVG
        </button>
        <!-- Download PNG -->
        <button
          @click="downloadPNG"
          class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          PNG
        </button>
      </div>
    </div>

    <!-- Canvas Area -->
    <div ref="containerRef" class="relative p-4 min-h-[400px] flex items-center justify-center">
      <!-- Empty State -->
      <div
        v-if="frequencies.length === 0 && !isGenerating"
        class="text-center py-20 px-6 select-none"
      >
        <!-- Decorative scattered words -->
        <div class="relative w-56 h-36 mx-auto mb-6">
          <span class="absolute left-2 top-2 text-[22px] font-bold text-indigo-200 -rotate-12">Hello</span>
          <span class="absolute right-4 top-0 text-[13px] font-medium text-purple-200 rotate-6">Design</span>
          <span class="absolute left-12 top-10 text-[28px] font-bold text-indigo-300/80">词云</span>
          <span class="absolute right-2 top-14 text-[11px] text-slate-300 -rotate-3">data</span>
          <span class="absolute left-0 top-[72px] text-[10px] text-purple-200 rotate-12">visual</span>
          <span class="absolute left-16 top-[68px] text-[16px] font-semibold text-indigo-200/70 rotate-3">文本</span>
          <span class="absolute right-6 top-[60px] text-[18px] font-bold text-purple-300/60 -rotate-6">Cloud</span>
          <span class="absolute left-4 bottom-4 text-[14px] font-medium text-slate-300/80 rotate-6">分析</span>
          <span class="absolute right-0 bottom-2 text-[12px] text-indigo-200 -rotate-12">word</span>
          <span class="absolute left-[45%] bottom-0 text-[20px] font-bold text-indigo-400/40 rotate-2">即刻</span>
        </div>
        
      </div>

      <!-- Loading State -->
      <div v-if="isGenerating" class="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
        <div class="flex flex-col items-center gap-2">
          <svg class="animate-spin w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span class="text-sm text-slate-500">正在生成词云...</span>
        </div>
      </div>

      <!-- Canvas -->
      <canvas
        v-show="frequencies.length > 0"
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        class="max-w-full"
        :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
      ></canvas>

      <!-- Hover Tooltip -->
      <div
        v-if="hoveredWord"
        class="absolute pointer-events-none bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-20"
        :style="{
          left: hoveredWord.x + 12 + 'px',
          top: hoveredWord.y - 32 + 'px',
        }"
      >
        <span class="font-medium">{{ hoveredWord.word }}</span>
        <span class="text-slate-300 ml-1.5">出现 {{ hoveredWord.count }} 次</span>
      </div>
    </div>
  </div>
</template>
