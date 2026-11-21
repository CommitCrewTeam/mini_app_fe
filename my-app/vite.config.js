import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = {
    '^/[a-z_]+_service/api/v1(?:/|$)': {
      target: env.GATEWAY_URL || 'http://localhost:6002',
      changeOrigin: true,
    },
  }
  return {
  plugins: [react(), tailwindcss()],
  server: {
    proxy,
  },
  preview: { proxy },
  }
})
