export interface WordFrequency {
  word: string
  count: number
}

export interface CloudSettings {
  maxWords: number
  minFontSize: number
  maxFontSize: number
  colorScheme: string
  shape: string
  fontFamily: string
  rotateRatio: number
  backgroundColor: string
  maskImage: string | null // data URL of the uploaded mask image
}

export type ColorScheme = {
  name: string
  label: string
  colors: string[]
}
