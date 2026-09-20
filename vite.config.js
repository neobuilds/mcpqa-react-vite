import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devPort = Number(env.VITE_PORT || process.env.VITE_PORT || 5173)
  const previewPort = Number(env.PREVIEW_PORT || process.env.PREVIEW_PORT || 4173)
  const host = env.PREVIEW_HOST || process.env.PREVIEW_HOST || '0.0.0.0'
  const devHost = env.VITE_HOST || process.env.VITE_HOST || '0.0.0.0'

  return {
    plugins: [react()],
    base: './',
    server: {
      host: devHost,
      port: devPort,
    },
    preview: {
      host,
      port: previewPort,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})