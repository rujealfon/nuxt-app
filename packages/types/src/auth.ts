import { z } from 'zod'

const registerRequired = 'Email, password and name are required'
const loginRequired = 'Email and password are required'
const invalidEmail = 'Invalid email'
const bcryptMaxBytes = 72
const passwordTooLong = 'Password must be at most 72 bytes'

function emailField(required: string) {
  return z.string(required).min(1, required).pipe(z.email(invalidEmail))
}

function fitsBcrypt(password: string) {
  return new TextEncoder().encode(password).byteLength <= bcryptMaxBytes
}

export const registerSchema = z.object({
  email: emailField(registerRequired),
  password: z.string(registerRequired)
    .min(8, 'Password must be at least 8 characters')
    .refine(fitsBcrypt, { error: passwordTooLong }),
  name: z.string(registerRequired).min(1, registerRequired),
})

export const loginSchema = z.object({
  email: emailField(loginRequired),
  password: z.string(loginRequired).min(1, loginRequired),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
