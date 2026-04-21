declare module 'wordcloud' {
  interface WordCloudOptions {
    list?: Array<[string, number]>
    gridSize?: number
    weightFactor?: number | ((size: number) => number)
    fontFamily?: string
    fontWeight?: string | number | ((word: string, weight: number) => string | number)
    color?: string | ((word: string, weight: number, fontSize: number, distance: number, theta: number) => string)
    backgroundColor?: string | null
    minSize?: number
    shape?: 'circle' | 'cardioid' | 'diamond' | 'square' | 'triangle-forward' | 'triangle' | 'pentagon' | 'star'
    rotateRatio?: number
    minRotation?: number
    maxRotation?: number
    clearCanvas?: boolean
    shrinkToFit?: boolean
    drawOutOfBound?: boolean
    hover?: ((item: [string, number, number, number], dimension: { x: number; y: number; w: number; h: number }, event: MouseEvent) => void) | null
    click?: ((item: [string, number, number, number], dimension: { x: number; y: number; w: number; h: number }, event: MouseEvent) => void) | null
    wait?: number
    abort?: (() => boolean)
    origin?: [number, number]
    ellipticity?: number
    classes?: string | ((word: string, weight: number) => string)
    shuffle?: boolean
  }

  function WordCloud(
    element: HTMLCanvasElement | HTMLElement | HTMLElement[],
    options: WordCloudOptions
  ): void

  namespace WordCloud {
    const isSupported: boolean
    function stop(): void
    function minFontSize: number
  }

  export = WordCloud
}
