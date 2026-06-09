import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path: Render usa '/' (root), GitHub Pages usa '/DeepPixel/'.
  // Seteá VITE_BASE_URL=/ en Render, omitilo para GitHub Pages.
  base: process.env.VITE_BASE_URL || '/DeepPixel/',
  build: {
    // Three.js is inherently large (WebGL, math, scene graph).
    // The 745 KB bundle is expected — suppress the non-actionable warning.
    chunkSizeWarningLimit: 1000
  }
})
