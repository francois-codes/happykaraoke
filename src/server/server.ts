import express from 'express'
import { app, server } from '@shared/server/express'
import { serverSocket } from '@shared/server/socket'
import { messages } from '@shared/messages'
import { endpoints } from '@shared/endpoints'
import bodyParser from 'body-parser'
import { socketEmitter } from '@shared/server/socketEmitter'
import { config } from '@shared/config'
import { watchForChanges } from '@shared/lib/data/watcher'
import { initializeConfig } from '@shared/lib/data/init'
import { join } from 'path'

export async function startServer() {
  // this initializes the app config by pulling the song_folder value from the db
  await initializeConfig()

  // this is a proxy event emitter so that the server implementation of socket
  // messages or endpont in @shared can emit without importing socket.io's server socket
  // This could be removed if the server functions in the shared folder
  // use dynamic impots instead, so the client bundler would
  // eliminate that code anyway
  socketEmitter.on('socket:emit', ({ event, payload }) => {
    serverSocket.emit(event, payload)
  })

  // this is the watcher which updates the app when the song folder changes
  const ab = new AbortController()
  socketEmitter.on('folder:changed', () => {
    ab.abort()
    watchForChanges(ab.signal)
  })

  // setting up body parser middleware to use json request body
  app.use(bodyParser.json())

  // registering all the endpoints declared in @shared/endpoints
  endpoints.forEach((endpoint) => {
    endpoint.register(app)
  })

  // registering all the messages declared in @shared/messages
  serverSocket.on('connection', (socket) => {
    messages.forEach((message) => {
      message.server.register(socket)
    })
  })

  // this is the setup of the vite dev server to use as a middleware
  // when running the app in dev mode.
  if (process.env.NODE_ENV === 'development') {
    const { createServer } = await import('vite')
    const { resolve } = await import('path')
    const userConfig = await import('../../vite.config')

    const viteDevServer = await createServer({
      server: { middlewareMode: true },
      ...userConfig.default
    })

    app.use(viteDevServer.middlewares)

    const handler = async (req, res) => {
      const template = resolve(process.cwd(), './src/client/index.html')
      const html = viteDevServer.transformIndexHtml(
        req.url,
        await import('fs').then((m) => m.promises.readFile(template, 'utf-8'))
      )
      res.send(html)
    }

    const frontendRoutes = ['/', '/session', '/join']

    // there's no fancy SSR here, so we just serve the index.html file
    // transformed by the vite dev server
    frontendRoutes.forEach((path) => {
      app.use(path, handler)
    })
  } else {
    // in production, we use the static assets built by vite
    app.use(express.static(join(__dirname, '../client')))
  }

  // this allows to reload the app when not in the root path
  const clientRoutes = ['/session', '/join']

  clientRoutes.forEach((path) => {
    app.get(path, (_, res) => {
      res.redirect('/')
    })
  })

  // now we're ready to start the server
  server.listen(config.PORT, () => {
    console.log(`Server started at http://localhost:${config.PORT}`)
  })

  // and we watch for changes in the song folder
  watchForChanges(ab.signal)

  return server
}
