import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animation library
          'vendor-motion': ['framer-motion'],
          // Audio library
          'vendor-audio': ['howler'],
          // Icons
          'vendor-icons': ['lucide-react'],
        }
      }
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'howler', 'lucide-react']
  }
})
