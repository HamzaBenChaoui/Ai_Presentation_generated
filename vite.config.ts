import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local development proxies /api to the running Slide AI backend
// (uvicorn on :8000). This keeps the frontend free of absolute URLs
// and avoids CORS during dev. In production the frontend and backend
// are served behind the same origin.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
