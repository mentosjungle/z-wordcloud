import type { WordFrequency } from '../types'

export type DataMode = 'frequency' | 'weight'

/**
 * 将 frequency 模式下的词频列表线性归一化为 weight 模式（0-100）
 */
export function normalizeToWeight(list: WordFrequency[]): WordFrequency[] {
    if (list.length === 0) return []
    const counts = list.map((i) => i.count)
    const min = Math.min(...counts)
    const max = Math.max(...counts)
    const range = max - min
    if (range === 0) {
        return list.map((i) => ({ ...i, count: 50 }))
    }
    return list.map((i) => ({
        ...i,
        count: Math.round(((i.count - min) / range) * 100),
    }))
}

/**
 * 根据旧模式和新模式转换词频数据
 */
export function convertFrequencies(
    list: WordFrequency[],
    from: DataMode,
    to: DataMode,
): WordFrequency[] {
    if (from === to) return list.map((v) => ({ ...v }))
    if (to === 'weight') {
        return normalizeToWeight(list)
    }
    // weight -> frequency: 原样保留，取消上限
    return list.map((v) => ({ ...v }))
}

export function clampWeight(v: number): number {
    return Math.max(0, Math.min(100, Math.round(v)))
}

export function ensurePositiveInt(v: number): number {
    return v <= 0 ? 1 : Math.round(v)
}
