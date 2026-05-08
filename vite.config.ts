import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy Notion cache API during local dev
      '/api/database': 'http://localhost:3001', // notion-cache running locally
      '/api/pages': 'http://localhost:3001',
    },
  },
})
