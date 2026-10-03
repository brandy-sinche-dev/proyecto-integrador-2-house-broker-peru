import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Separa el runtime de React del código de la aplicación para
        // mejorar el cacheo entre despliegues (WPO-PROP-01).
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
          }
          return undefined
        },
      },
    },
  },
})
