declare module 'jieba-wasm' {
  /**
   * 初始化 jieba-wasm，加载 WebAssembly 模块
   * @param module_or_path 可选的 WASM 文件路径或模块，不传则使用默认路径
   */
  export default function init(module_or_path?: string | URL | Request | Response | BufferSource | WebAssembly.Module): Promise<void>

  /**
   * 对文本进行分词
   * @param text 待分词的文本
   * @param hmm 是否启用 HMM 模型识别新词
   * @returns 分词结果数组
   */
  export function cut(text: string, hmm?: boolean): string[]

  /**
   * 添加自定义词语到词典
   * @param word 自定义词语
   * @param freq 词频（权重），数值越大越优先匹配
   */
  export function add_word(word: string, freq?: number): void
}
