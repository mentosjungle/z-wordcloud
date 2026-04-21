import cloud from 'd3-cloud'
import type { WordFrequency, CloudSettings } from '../types'
import { getColorFunction } from '../data/colorSchemes'

interface PlacedWord {
  text: string
  size: number
  x: number
  y: number
  rotate: number
  color: string
  font: string
}

/**
 * 使用 d3-cloud 计算词云布局并生成 SVG 字符串
 */
export function generateSVG(
  frequencies: WordFrequency[],
  settings: CloudSettings,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const list = frequencies.slice(0, settings.maxWords)
    if (list.length === 0) {
      reject(new Error('No words to render'))
      return
    }

    const maxCount = list[0].count
    const colorFn = getColorFunction(settings.colorScheme)
    const placed: PlacedWord[] = []

    const layout = cloud()
      .size([width, height])
      .words(list.map(w => ({
        text: w.word,
        size: w.count,
        count: w.count,
      })))
      .padding(2)
      .rotate(() => {
        if (Math.random() > settings.rotateRatio) return 0
        return (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 45)
      })
      .font(settings.fontFamily)
      .fontSize((d: any) => {
        const normalized = d.size / maxCount
        return settings.minFontSize +
          normalized * (settings.maxFontSize - settings.minFontSize)
      })
      .on('end', (words: any[]) => {
        for (const w of words) {
          placed.push({
            text: w.text!,
            size: w.size!,
            x: w.x!,
            y: w.y!,
            rotate: w.rotate!,
            color: colorFn(w.text!, w.size!),
            font: settings.fontFamily,
          })
        }

        const svg = buildSVGString(placed, width, height)
        resolve(svg)
      })

    layout.start()
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildSVGString(words: PlacedWord[], width: number, height: number): string {
  const texts = words.map(w => {
    const transform = `translate(${w.x},${w.y}) rotate(${w.rotate})`
    return `    <text
      transform="${transform}"
      font-size="${w.size}px"
      font-family="${escapeXml(w.font)}"
      fill="${w.color}"
      text-anchor="middle"
      dominant-baseline="central"
    >${escapeXml(w.text)}</text>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
  width="${width}" height="${height}"
  viewBox="${-width / 2} ${-height / 2} ${width} ${height}">
${texts}
</svg>`
}

export function downloadSVG(svgString: string, filename?: string) {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename || `wordcloud-${Date.now()}.svg`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
