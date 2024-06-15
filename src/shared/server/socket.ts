import { Server } from 'socket.io'
import { server } from './express'

export const serverSocket = new Server(server)
