import { config } from '@shared/config'
import { createUser, getUser } from '@shared/lib/users'
import { UserLoginPayload, UserLoginResponse } from '@shared/schemas/users'
import { UserType } from '@shared/types'
import { createEndpoint } from '@shared/types/endpoints'
import { v4 as uuid } from 'uuid'

export const loginUser = createEndpoint<UserLoginPayload, UserLoginResponse>({
  method: 'post',
  url: '/login',
  handler: async (req, res) => {
    const { password } = req.body

    if (password !== config.ADMIN_PASSWORD) {
      res.sendStatus(401)
      return
    }

    const userId = uuid()
    const user = createUser(userId, 'admin', UserType.ADMIN)

    res.status(200).json({ user })
  }
})

export const fetchUser = createEndpoint<{ id: string }, UserLoginResponse>({
  method: 'get',
  url: '/user',
  handler: async (req, res) => {
    const { id } = req.query
    const user = getUser(id)

    if (!user) {
      res.sendStatus(404)
      return
    }

    res.status(200).json({ user })
  }
})

export const joinSession = createEndpoint<{ userName: string }, UserLoginResponse>({
  method: 'post',
  url: '/join',
  handler: async (req, res) => {
    const { userName } = req.body
    const userId = uuid()
    const user = createUser(userId, userName, UserType.GUEST)

    res.status(200).json({ user })
  }
})
