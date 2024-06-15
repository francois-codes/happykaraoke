import { createServer } from 'vite'
import { startServer } from './server'
import { resolve } from 'path'

startServer(async (app) => {
  const viteDevServer = await createServer({
    server: { middlewareMode: true },
    root: './src/client',
    base: '/',
    resolve: {
      alias: {
        '@': resolve(__dirname, '../client'),
        '@shared': resolve(__dirname, '../shared')
      }
    }
  })

  app.use(viteDevServer.middlewares)
})
