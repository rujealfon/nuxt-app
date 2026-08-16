import { z } from 'zod'

const registerRequired = 'Email, password and name are required'
const loginRequired = 'Email and password are required'

export const registerSchema = z.object({
  email: z.string(registerRequired).min(1, registerRequired),
  password: z.string(registerRequired).min(8, 'Password must be at least 8 characters'),
  name: z.string(registerRequired).min(1, registerRequired),
})

export const loginSchema = z.object({
  email: z.string(loginRequired).min(1, loginRequired),
  password: z.string(loginRequired).min(1, loginRequired),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
