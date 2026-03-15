import { io } from 'socket.io-client'
import { tauriSocket } from './tauriSocket'

/** Socket.IO client when on Electron; WebSocket wrapper when on Tauri. */
export const socket = tauriSocket ?? io()
