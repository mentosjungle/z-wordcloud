import type { ColorScheme } from '../types'

export const colorSchemes: ColorScheme[] = [
  {
    name: 'random',
    label: '随机多彩',
    colors: [], // handled specially
  },
  {
    name: 'business',
    label: '商务蓝',
    colors: ['#1e3a5f', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8'],
  },
  {
    name: 'morandi',
    label: '莫兰迪',
    colors: ['#b4a7d6', '#d5a6bd', '#c27ba0', '#8e7cc3', '#a4c2f4', '#9fc5e8'],
  },
  {
    name: 'cyberpunk',
    label: '赛博朋克',
    colors: ['#ff006e', '#8338ec', '#3a86ff', '#fb5607', '#ffbe0b', '#ff48c4'],
  },
  {
    name: 'sunset',
    label: '暖阳日落',
    colors: ['#ff6b6b', '#ee5a24', '#f0932b', '#fad390', '#e55039', '#eb4d4b'],
  },
  {
    name: 'forest',
    label: '深林翠绿',
    colors: ['#1b5e20', '#2e7d32', '#388e3c', '#43a047', '#66bb6a', '#81c784'],
  },
  {
    name: 'ocean',
    label: '深海蓝调',
    colors: ['#006064', '#00838f', '#0097a7', '#00acc1', '#00bcd4', '#26c6da'],
  },
  {
    name: 'autumn',
    label: '秋日暖橘',
    colors: ['#bf360c', '#d84315', '#e64a19', '#f4511e', '#ff5722', '#ff7043'],
  },
]

export function getColorFunction(schemeName: string): (word: string, weight: number) => string {
  if (schemeName === 'random') {
    return () => `hsl(${Math.random() * 360}, ${60 + Math.random() * 20}%, ${40 + Math.random() * 20}%)`
  }
  const scheme = colorSchemes.find(s => s.name === schemeName)
  if (!scheme || scheme.colors.length === 0) {
    return () => `hsl(${Math.random() * 360}, 70%, 50%)`
  }
  return () => scheme.colors[Math.floor(Math.random() * scheme.colors.length)]
}
