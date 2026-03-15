import type { Socket as ServerSocket } from 'socket.io'

import { useEffect } from 'react'
import { socketEmitter } from '@shared/server/socketEmitter'

/** Minimal socket interface for client (Socket.IO or Tauri WebSocket). */
export interface ClientSocketLike {
  on(event: string, callback: (payload: unknown) => void): void
  off(event: string, callback: (payload: unknown) => void): void
  emitWithAck?(event: string, payload: unknown): Promise<unknown>
}

export function createMessage<Payload, ResponsePayload>({
  event,
  handler
}: {
  event: string
  handler?: (payload: Payload, callback: (response: ResponsePayload) => void) => void
}) {
  // server methods
  function register(socket: ServerSocket) {
    if (handler) {
      socket.on(event, handler)
    }
  }

  function emit(payload: Payload) {
    socketEmitter.emit('socket:emit', { event, payload })
  }

  // client methods

  function emitWithAck(socket: ClientSocketLike, payload: Payload): Promise<ResponsePayload> {
    if (socket.emitWithAck) return socket.emitWithAck(event, payload) as Promise<ResponsePayload>
    return Promise.resolve(undefined as unknown as ResponsePayload)
  }

  function listen(socket: ClientSocketLike, listener: (payload: Payload) => void) {
    socket.on(event, listener as (payload: unknown) => void)
  }

  const emptyDeps: unknown[] = []

  function useMessage(
    socket: ClientSocketLike,
    callback: (payload: Payload) => void,
    deps = emptyDeps
  ) {
    useEffect(() => {
      socket.on(event, callback as (payload: unknown) => void)

      return () => {
        socket.off(event, callback as (payload: unknown) => void)
      }
    }, deps)
  }

  return {
    server: {
      register,
      emit
    },
    client: {
      emitWithAck,
      listen,
      useMessage
    }
  }
}
