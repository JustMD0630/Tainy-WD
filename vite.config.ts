import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'src/client', // Vite ahora buscará en src/client
  publicDir: '../../public', // Si tienes assets públicos fuera de src/client
  build: {
    outDir: '../../dist/client', // Salida compilada para que server.ts la sirva
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/client'),
    },
  },
  server: {
    proxy: {
      '/v1': {
        target: 'http://localhost:2333',
        changeOrigin: true,
        ws: true,
      },
      '/api': {
        target: 'http://localhost:2333',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:2333',
        changeOrigin: true,
      }
    }
  }
})