import { randomBytes } from 'node:crypto'
import { cookieName } from '@mysite/config'

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

function sessionKey(id: string): string {
  return `session:${id}`
}

export async function createSession(
  event: Parameters<typeof setCookie>[0],
  userId: string,
): Promise<void> {
  const id = randomBytes(32).toString('base64url')

  await useRedis().set(sessionKey(id), userId, 'EX', SESSION_TTL_SECONDS)

  setCookie(event, cookieName, id, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function getSessionUserId(
  event: Parameters<typeof getCookie>[0],
): Promise<string | null> {
  const id = getCookie(event, cookieName)
  return id ? useRedis().get(sessionKey(id)) : null
}

export async function destroySession(
  event: Parameters<typeof getCookie>[0],
): Promise<void> {
  const id = getCookie(event, cookieName)

  if (id) {
    await useRedis().del(sessionKey(id))
  }

  deleteCookie(event, cookieName, { path: '/' })
}
