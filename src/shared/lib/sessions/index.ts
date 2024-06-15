type Session = {
  name: string
  id: string
}

const sessions = new Map<string, Session>()

export function getSession(id: string) {
  return sessions.get(id)
}

export function createSession(id: string, name: string) {
  sessions.set(id, { id, name })
}
