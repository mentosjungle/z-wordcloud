import init, { cut, add_word } from 'jieba-wasm'
import { stopwords } from '../data/stopwords'
import type { WordFrequency } from '../types/index'

let initialized = false
let useFallback = false

/**
 * 降级分词：当 jieba-wasm 加载失败时使用
 * 基于标点和常见分隔符的简单分词，效果不如 jieba 但能保证可用性
 */
function fallbackSegment(text: string): string[] {
  // 统一替换常见分隔符为空格
  const normalized = text
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[.,;!?。，；！？、""''（）()\[\]【】《》<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // 先按空格拆分英文单词
  const segments = normalized.split(' ')
  const result: string[] = []

  for (const seg of segments) {
    const trimmed = seg.trim()
    if (!trimmed) continue

    // 如果是纯英文/数字，直接保留
    if (/^[a-zA-Z0-9]+$/.test(trimmed)) {
      result.push(trimmed)
      continue
    }

    // 中文：逐字滑动窗口提取 2~4 字词（简单模拟）
    // 对于纯中文，采用 unigram + bigram 混合
    const chs = trimmed.split('')
    // 先加所有单字（会被后续过滤长度筛掉大部分）
    for (const ch of chs) {
      if (/[\u4e00-\u9fa5]/.test(ch)) {
        result.push(ch)
      }
    }
    // 再加 bigram
    for (let i = 0; i < chs.length - 1; i++) {
      const bigram = chs[i] + chs[i + 1]
      if (/^[\u4e00-\u9fa5]{2}$/.test(bigram)) {
        result.push(bigram)
      }
    }
    // 再加 trigram
    for (let i = 0; i < chs.length - 2; i++) {
      const trigram = chs[i] + chs[i + 1] + chs[i + 2]
      if (/^[\u4e00-\u9fa5]{3}$/.test(trigram)) {
        result.push(trigram)
      }
    }
  }

  return result
}

export async function initSegmenter(): Promise<void> {
  if (initialized) return
  try {
    await init()
    initialized = true
  } catch (e) {
    console.warn('jieba-wasm init failed, using fallback segmenter:', e)
    useFallback = true
    initialized = true // fallback 模式下也标记为 ready
  }
}

export function segmentText(text: string): string[] {
  if (!initialized) {
    throw new Error('Segmenter not initialized. Call initSegmenter() first.')
  }
  if (useFallback) {
    return fallbackSegment(text)
  }
  return cut(text, true)
}

/**
 * 添加自定义词到分词词典，使 jieba 能正确识别这些词
 */
export function addCustomDictWords(words: string[]): void {
  if (!initialized) return
  for (const word of words) {
    const trimmed = word.trim()
    if (trimmed.length > 0) {
      // 使用较高词频确保分词器优先匹配
      add_word(trimmed, 50000)
    }
  }
}

export function countWordFrequency(
  text: string,
  customStopwords?: Set<string>
): WordFrequency[] {
  const words = segmentText(text)
  const mergedStopwords = customStopwords
    ? new Set([...stopwords, ...customStopwords])
    : stopwords

  const freq = new Map<string, number>()

  for (const word of words) {
    const trimmed = word.trim()
    // 过滤: 长度 < 2 的词、纯空白、纯数字、停用词
    if (
      trimmed.length < 2 ||
      /^\s*$/.test(trimmed) ||
      /^\d+$/.test(trimmed) ||
      mergedStopwords.has(trimmed) ||
      mergedStopwords.has(trimmed.toLowerCase())
    ) {
      continue
    }
    freq.set(trimmed, (freq.get(trimmed) || 0) + 1)
  }

  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
}
