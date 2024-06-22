import { User, UserType } from '@shared/types'
import { getCurrentSession } from '../session'

const users = new Map<string, User>()

users.set('devAdmin', { id: 'devAdmin', name: 'Dev Admin', type: UserType.ADMIN })
users.set('devUser', { id: 'devUser', name: 'Dev User', type: UserType.GUEST })

export async function getUser(id: number) {
  const { eq, and } = await import('drizzle-orm')
  const { db } = await import('@shared/db')
  const { user } = await import('@shared/db/schema')
  const currentSession = await getCurrentSession()

  if (!currentSession) {
    return undefined
  }

  const [result] = await db
    .select()
    .from(user)
    .where(and(eq(user.id, id), eq(user.sessionId, currentSession.id)))
    .limit(1)

  return result
}

export async function createUser(name: string, type = UserType.GUEST) {
  const { db } = await import('@shared/db')
  const { user } = await import('@shared/db/schema')
  const currentSession = await getCurrentSession()

  if (!currentSession) {
    throw new Error('there is no session !')
  }

  const [result] = await db
    .insert(user)
    .values({ name, type, sessionId: currentSession.id })
    .returning({
      id: user.id,
      name: user.name,
      type: user.type
    })

  return result
}
