import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/ui/',
  build: { outDir: '../public/ui', emptyOutDir: true },
  server: {
    host: '127.0.0.1',
    port: 5173,
    // Allows the default VITE_API_URL=/api to work in local development
    // without any .env file. Set VITE_API_URL to the VM address when the
    // backend runs on another machine.
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
