import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { resolve } from 'path'

const host = process.env.TAURI_DEV_HOST

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
    emptyOutDir: true,
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG
  },
  server: {
    port: 5173,
    strictPort: true,
    host: host ?? false,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src/client'),
      '@shared': resolve(process.cwd(), 'src/shared'),
      fs: 'memfs'
    }
  }
})
