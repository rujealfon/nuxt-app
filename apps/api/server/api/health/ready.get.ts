import { sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()
  const result = await db.execute<{ ok: number }>(sql`select 1 as ok`)

  return {
    database: result.rows[0]?.ok === 1,
  }
})
