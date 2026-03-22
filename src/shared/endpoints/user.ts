import { config } from '@shared/config'
import {
  checkAndRefreshSession,
  countAdminsForSession,
  getCurrentSession,
  setScrollHostUserIdIfUnset,
  startSessionIfNeeded
} from '@shared/lib/session'
import { createUser, getUser } from '@shared/lib/users'
import { UserLoginPayload, UserLoginResponse } from '@shared/schemas/users'
import { UserType } from '@shared/types'
import { createEndpoint } from '@shared/types/endpoints'

export const loginUser = createEndpoint<UserLoginPayload, UserLoginResponse>({
  method: 'post',
  url: '/login',
  handler: async (req, res) => {
    const { password } = req.body

    if (password !== config.ADMIN_PASSWORD) {
      res.sendStatus(401)
      return
    }

    await startSessionIfNeeded()

    const user = await createUser('admin', UserType.ADMIN)

    const current = await getCurrentSession()
    if (current) {
      await setScrollHostUserIdIfUnset(current.id, user.id)
    }

    res.status(200).json({ user })
  }
})

export const fetchUser = createEndpoint<{ id: number }, UserLoginResponse>({
  method: 'get',
  url: '/user',
  handler: async (req, res) => {
    const { id } = req.query
    const user = await getUser(id)

    if (!user) {
      res.sendStatus(404)
      return
    }

    // If admin user, ensure a valid session exists
    if (user.type === UserType.ADMIN) {
      await checkAndRefreshSession()
      const open = await getCurrentSession()
      if (open && (await countAdminsForSession(open.id)) === 1) {
        await setScrollHostUserIdIfUnset(open.id, user.id)
      }
    }

    res.status(200).json({ user })
  }
})

export const joinSession = createEndpoint<{ userName: string, adminPassword: string }, UserLoginResponse>({
  method: 'post',
  url: '/join',
  handler: async (req, res) => {
    const { userName, adminPassword } = req.body
    try {
      const userType = adminPassword === config.ADMIN_PASSWORD ? UserType.ADMIN : UserType.GUEST
      const user = await createUser(userName, userType)
      res.status(200).json({ user })
    } catch {
      res.sendStatus(401)
    }
  }
})
