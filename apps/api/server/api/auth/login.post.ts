import type { SessionUser } from '@mysite/types'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, password?: string }>(event)

  if (!body?.email || !body?.password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required',
    })
  }

  const user: SessionUser = {
    id: 'usr_1',
    email: body.email,
    name: body.email.split('@')[0] || body.email,
    roles: ['user'],
  }

  const token = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
    }),
  ).toString('base64url')

  setSessionToken(event, token)

  return user
})
