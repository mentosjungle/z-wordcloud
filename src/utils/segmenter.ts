import init, { cut, add_word } from 'jieba-wasm'
import { stopwords } from '../data/stopwords'
import type { WordFrequency } from '../types'

let initialized = false

export async function initSegmenter(): Promise<void> {
  if (initialized) return
  await init()
  initialized = true
}

export function segmentText(text: string): string[] {
  if (!initialized) {
    throw new Error('Segmenter not initialized. Call initSegmenter() first.')
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
