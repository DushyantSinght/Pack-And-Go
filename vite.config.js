// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const BANNER = '/*! Pack&Go © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited. */'

// Adds the copyright banner to every built JS/CSS file after minification.
const dstBanner = () => ({
  name: 'dst-banner',
  apply: 'build',
  enforce: 'post',
  generateBundle(_, bundle) {
    for (const file of Object.values(bundle)) {
      if (file.type === 'chunk') file.code = `${BANNER}\n${file.code}`
      else if (file.fileName.endsWith('.css')) file.source = `${BANNER}\n${file.source}`
    }
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dstBanner()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
