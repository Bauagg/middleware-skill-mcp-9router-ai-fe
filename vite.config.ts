import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = {
    target: env.VITE_PROXY_TARGET || 'http://localhost:4000',
    changeOrigin: true,
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Forward backend paths during development so the browser stays same-origin
      // (no CORS, and response headers like X-Skill stay readable).
      // /api = admin API, /v1 = OpenAI-compatible proxy to 9Router, /images and /videos = generated files.
      proxy: {
        // ws: the Gemini sign-in screen (noVNC) is a WebSocket under /api
        '/api': { ...backend, ws: true },
        '/v1': backend,
        '/images': backend,
        '/videos': backend,
      },
    },
  }
})
