import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // MCP clients (Claude Code, ZKR, ...) discover OAuth endpoints on the
      // SAME origin as the MCP server URL — these paths must reach the
      // backend, not the SPA fallback (a 200 HTML body would break their
      // JSON parsing).
      '/.well-known/oauth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
