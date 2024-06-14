import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: './src/client',
  build: {
    outDir: '../../out/client',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/client'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  }
})
