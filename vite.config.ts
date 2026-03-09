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
})