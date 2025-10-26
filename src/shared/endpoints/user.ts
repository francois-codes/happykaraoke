import { config } from '@shared/config'
import { startSessionIfNeeded } from '@shared/lib/session'
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
      const { checkAndRefreshSession } = await import('@shared/lib/session')
      await checkAndRefreshSession()
    }

    res.status(200).json({ user })
  }
})

export const joinSession = createEndpoint<{ userName: string }, UserLoginResponse>({
  method: 'post',
  url: '/join',
  handler: async (req, res) => {
    const { userName } = req.body
    try {
      const user = await createUser(userName, UserType.GUEST)
      res.status(200).json({ user })
    } catch {
      res.sendStatus(401)
    }
  }
})
