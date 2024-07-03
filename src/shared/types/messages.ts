import type { Socket as ClientSocket } from 'socket.io-client'
import type { Socket as ServerSocket } from 'socket.io'

import { useEffect } from 'react'
import { socketEmitter } from '@shared/server/socketEmitter'

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

  function emitWithAck(socket: ClientSocket, payload: Payload): Promise<ResponsePayload> {
    return socket.emitWithAck(event, payload)
  }

  function listen(socket: ClientSocket, listener: (payload: Payload) => void) {
    socket.on(event, listener)
  }

  const emptyDeps: unknown[] = []

  function useMessage(
    socket: ClientSocket,
    callback: (payload: Payload) => void,
    deps = emptyDeps
  ) {
    useEffect(() => {
      socket.on(event, callback)

      return () => {
        socket.off(event, callback)
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
