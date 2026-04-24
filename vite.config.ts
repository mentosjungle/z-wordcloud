import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [vue(), tailwindcss(), cloudflare()],
  base: './', // ← 【必须添加】确保资源使用相对路径，适配桌面应用和离线环境
  clearScreen: false, // ← Tauri dev 模式时保留终端日志，避免 Vite 清屏
  optimizeDeps: {
    exclude: ['jieba-wasm'],
  },
})