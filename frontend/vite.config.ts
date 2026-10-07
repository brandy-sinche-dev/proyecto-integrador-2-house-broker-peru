import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo el proxy evita el cruce de orígenes: el navegador solo
    // habla con Vite y Vite reenvía `/api` a Django. Así la cookie de refresh
    // (SameSite=Strict) viaja siempre misma-origin.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
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
