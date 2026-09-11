import type { SessionUser } from '@mysite/types'
import { eq } from 'drizzle-orm'
import { users } from '../database/schema'

type UserRow = typeof users.$inferSelect

export function toSessionUser(user: UserRow): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    roles: user.roles,
  }
}

export async function getCurrentUser(
  event: Parameters<typeof getCookie>[0],
): Promise<SessionUser | null> {
  const userId = await getSessionUserId(event)

  if (!userId) {
    return null
  }

  const db = useDb()
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

  return row ? toSessionUser(row) : null
}
