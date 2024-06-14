import { createServer } from 'vite'
import { startServer } from './server'
import { shared } from 'src/shared/utils'
import { resolve } from 'path'

shared()

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
