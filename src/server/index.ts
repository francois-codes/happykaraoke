import { createServer } from 'vite'
import { startServer } from './server'
import { resolve } from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

startServer(async (app) => {
  const viteDevServer = await createServer({
    server: { middlewareMode: true },
    plugins: [nodePolyfills({ include: ['path', 'os', 'stream', 'util', 'buffer'] })],
    root: './src/client',
    base: '/',
    resolve: {
      alias: {
        '@': resolve(__dirname, '../client'),
        '@shared': resolve(__dirname, '../shared'),
        fs: 'memfs'
      }
    }
  })

  app.use(viteDevServer.middlewares)
})
