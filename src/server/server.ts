import express from 'express'
import { app, server } from '@shared/server/express'
import { serverSocket } from '@shared/server/socket'
import { messages } from '@shared/messages'
import { endpoints } from '@shared/endpoints'
import bodyParser from 'body-parser'
import { socketEmitter } from '@shared/server/socketEmitter'

export async function startServer(configure: (app: express.Express) => void) {
  socketEmitter.on('socket:emit', ({ event, payload }) => {
    serverSocket.emit(event, payload)
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

  server.listen(8081, () => {
    console.log('Server started at http://localhost:8081')
  })

  return server
}
