import express from 'express'
import { app, server } from '@shared/server/express'
import { serverSocket } from '@shared/server/socket'
import { messages } from '@shared/messages'
import { endpoints } from '@shared/endpoints'
import bodyParser from 'body-parser'
import { socketEmitter } from '@shared/server/socketEmitter'
import { config } from '@shared/config'
import { watchForChanges } from '@shared/lib/data/watcher'

export async function startServer(configure: (app: express.Express) => void) {
  const ab = new AbortController()

  socketEmitter.on('socket:emit', ({ event, payload }) => {
    serverSocket.emit(event, payload)
  })

  socketEmitter.on('folder:changed', () => {
    ab.abort()
    watchForChanges(ab.signal)
  })

  app.use(bodyParser.json())

  endpoints.forEach((endpoint) => {
    endpoint.register(app)
  })

  serverSocket.on('connection', (socket) => {
    messages.forEach((message) => {
      message.server.register(socket)
    })
  })

  configure(app)

  server.listen(config.PORT, () => {
    console.log(`Server started at http://localhost:${config.PORT}`)
  })

  watchForChanges(ab.signal)

  return server
}
