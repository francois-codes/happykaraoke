import { UserType } from '@shared/types'
import { z } from 'zod'

export const userLoginPayload = z.object({
  password: z.string().min(1),
  sessionName: z.string().min(1)
})

export type UserLoginPayload = z.infer<typeof userLoginPayload>

export const userLoginResponse = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    type: z.nativeEnum(UserType)
  })
})

export type UserLoginResponse = z.infer<typeof userLoginResponse>
