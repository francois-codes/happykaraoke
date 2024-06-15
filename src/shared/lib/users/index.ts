import { User, UserType } from '@shared/types'

const users = new Map<string, User>()

export function getUser(id: string) {
  return users.get(id)
}

export function createUser(id: string, name: string, type = UserType.GUEST) {
  users.set(id, { id, name, type })
  return users.get(id)
}
