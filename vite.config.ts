import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

declare const process: { cwd: () => string }
declare const Buffer: {
  from: (value: string) => { toString: (encoding: 'base64') => string }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: '/careAtlas/',
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/snow': {
          target: `https://${env.SNOW_INSTANCE || 'localhost'}`,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/snow/, ''),
          configure: (proxy) => {
            const proxyWithEvents = proxy as unknown as {
              on: (event: 'proxyReq', handler: (proxyReq: { setHeader: (name: string, value: string) => void }) => void) => void
            }

            proxyWithEvents.on('proxyReq', (proxyReq) => {
              const credentials = Buffer.from(
                `${env.SNOW_USERNAME}:${env.SNOW_PASSWORD}`
              ).toString('base64')
              proxyReq.setHeader('Authorization', `Basic ${credentials}`)
              proxyReq.setHeader('Accept', 'application/json')
            })
          },
        },
      },
    },
  }
})
