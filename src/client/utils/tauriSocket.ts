/**
 * WebSocket-based socket for Tauri backend. Replaces Socket.IO client when running in Tauri.
 * Listens to ws://127.0.0.1:8081/ws and dispatches { event, payload } to .on(event) listeners.
 */
import { isTauri } from '@/lib/tauriEnv'

type Listener = (payload: unknown) => void

class TauriWsSocket {
  private ws: WebSocket | null = null
  private listeners = new Map<string, Set<Listener>>()
  constructor() {
    if (!isTauri) return
    this.connect()
  }

  private connect() {
    try {
      this.ws = new WebSocket('ws://127.0.0.1:8081/ws')
      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as { event?: string; payload?: unknown }
          if (msg.event) {
            const cbs = this.listeners.get(msg.event)
            if (cbs) for (const cb of cbs) cb(msg.payload)
          }
        } catch (_) {}
      }
      this.ws.onclose = () => {
        this.ws = null
        setTimeout(() => this.connect(), 2000)
      }
      this.ws.onerror = () => {}
    } catch (_) {}
  }

  on(event: string, callback: Listener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: Listener): void {
    this.listeners.get(event)?.delete(callback)
  }

  emitWithAck(_event: string, _payload: unknown): Promise<unknown> {
    return Promise.resolve(null)
  }
}

export const tauriSocket = isTauri ? new TauriWsSocket() : null
