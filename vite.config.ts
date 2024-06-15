import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['path', 'os', 'stream', 'util', 'buffer']
    })
  ],
  root: './src/client',
  build: {
    outDir: '../../out/client',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/client'),
      '@shared': resolve(__dirname, 'src/shared'),
      fs: 'memfs'
    }
  }
})
