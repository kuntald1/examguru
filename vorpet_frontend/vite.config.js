import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api':        { target: 'http://vorpet_api:8000', changeOrigin: true },
      '/auth':       { target: 'http://vorpet_api:8000', changeOrigin: true },
      '/superadmin': { target: 'http://vorpet_api:8000', changeOrigin: true },
      '/billing':    { target: 'http://vorpet_api:8000', changeOrigin: true },
      '/export':     { target: 'http://vorpet_api:8000', changeOrigin: true },
      '/outputs':    { target: 'http://vorpet_api:8000', changeOrigin: true },
      '/static':     { target: 'http://vorpet_api:8000', changeOrigin: true },
    },
  },
})
