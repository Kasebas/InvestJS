import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/InvestJS/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => id.includes('node_modules/recharts') ? 'charts' : undefined,
      },
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
