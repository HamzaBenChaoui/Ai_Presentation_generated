import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Backend origin — override with BACKEND_URL when something else already
// listens on 8000 (e.g. `BACKEND_URL=http://localhost:8001 npm run dev`).
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      // MCP clients (Claude Code, ZKR, ...) discover OAuth endpoints on the
      // SAME origin as the MCP server URL — these paths must reach the
      // backend, not the SPA fallback (a 200 HTML body would break their
      // JSON parsing).
      '/.well-known/oauth': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
})
