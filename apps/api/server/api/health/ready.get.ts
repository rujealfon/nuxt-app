import { sql } from 'drizzle-orm'
import { readyResponseSchema } from '../../utils/infra'

export default defineEventHandler(async () => {
  const db = useDb()
  const redis = useRedis()

  const result = await db.execute<{ ok: number }>(sql`select 1 as ok`)

  return readyResponseSchema.parse({
    database: result.rows[0]?.ok === 1,
    redis: (await redis.ping()) === 'PONG',
  })
})
