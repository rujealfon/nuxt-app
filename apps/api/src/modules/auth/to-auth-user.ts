import type { AuthUser } from '@nuxt-app/types'

export function toAuthUser(user: {
  publicId: string
  email: string
  name: string
  role: string
}): AuthUser {
  return {
    id: user.publicId,
    email: user.email,
    name: user.name,
    role: user.role as AuthUser['role'],
  }
}
