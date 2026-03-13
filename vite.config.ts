import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forward to netlify dev (port 8888) when running plain `vite`
      '/fetch-notion': 'http://localhost:8888',
    },
  },
})
