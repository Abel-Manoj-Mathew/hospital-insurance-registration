import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Lets the app be opened through an HTTPS tunnel (needed for camera access on a phone) with
    // the API reached on the same origin, so no CORS or mixed-content issues.
    allowedHosts: true,
    proxy: { '/api': 'http://localhost:4000' },
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
})
