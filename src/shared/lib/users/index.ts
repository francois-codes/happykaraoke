import { User, UserType } from '@shared/types'

const users = new Map<string, User>()

users.set('devAdmin', { id: 'devAdmin', name: 'Dev Admin', type: UserType.ADMIN })
users.set('devUser', { id: 'devUser', name: 'Dev User', type: UserType.GUEST })

export function getUser(id: string) {
  return users.get(id)
}

export function createUser(id: string, name: string, type = UserType.GUEST) {
  users.set(id, { id, name, type })
  return users.get(id)!
}
