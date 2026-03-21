import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/crm-data-dictionary/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'ModuleDetail': ['./src/sections/react/ModuleDetail/index.jsx'],
          'Blueprints': ['./src/sections/react/Blueprints.jsx'],
        }
      }
    }
  }
})
