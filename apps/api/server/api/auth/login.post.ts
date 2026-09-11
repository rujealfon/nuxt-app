import { loginSchema } from '@mysite/types'
import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const parsed = loginSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid email and password are required',
    })
  }

  const db = useDb()
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1)

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials',
    })
  }

  await createSession(event, user.id)

  return toSessionUser(user)
})
