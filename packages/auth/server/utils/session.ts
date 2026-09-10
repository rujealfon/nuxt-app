import type { SessionUser } from '@mysite/types'
import { cookieName } from '@mysite/config'

export function getSessionToken(event: Parameters<typeof getCookie>[0]) {
  return getCookie(event, cookieName)
}

export function setSessionToken(
  event: Parameters<typeof setCookie>[0],
  token: string,
  maxAge = 60 * 60 * 24 * 7,
) {
  setCookie(event, cookieName, token, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
}

export function clearSessionToken(event: Parameters<typeof deleteCookie>[0]) {
  deleteCookie(event, cookieName, { path: '/' })
}

export async function getCurrentUser(
  event: Parameters<typeof getCookie>[0],
): Promise<SessionUser | null> {
  const token = getSessionToken(event)

  if (!token) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'))
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: payload.roles ?? ['user'],
    }
  }
  catch {
    return null
  }
}
