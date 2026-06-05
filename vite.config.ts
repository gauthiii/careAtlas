import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

declare const process: { cwd: () => string }

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8000'

  return {
    base: '/careAtlas/',
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // Forward API calls to the FastAPI backend (see /server).
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
