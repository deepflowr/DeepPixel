import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path para GitHub Pages: https://<user>.github.io/DeepPixel/
  base: '/DeepPixel/',
  build: {
    // Three.js is inherently large (WebGL, math, scene graph).
    // The 745 KB bundle is expected — suppress the non-actionable warning.
    chunkSizeWarningLimit: 1000
  }
})
