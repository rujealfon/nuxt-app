import { z } from 'zod'

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  roles: z.array(z.string()),
})

export type SessionUser = z.infer<typeof sessionUserSchema>

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginCredentials = z.infer<typeof loginSchema>
