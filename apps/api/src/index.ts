import { serve } from '@hono/node-server'
import app from '#api/app.js'
import { runMigrations } from '#api/db/index.js'
import { env, isDev } from '#api/env.js'
import { deleteExpiredSessions } from '#api/modules/auth/session.js'
import { connectRedis } from '#api/redis.js'

const port = env.API_PORT
const hostname = env.API_HOST

async function main() {
  await runMigrations()
  await deleteExpiredSessions()
  await connectRedis()

  const host = hostname === '0.0.0.0' ? 'localhost' : hostname
  // eslint-disable-next-line no-console
  console.log(`API running on http://${host}:${port}`)
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(`Scalar docs at http://${host}:${port}/docs`)
  }

  serve({
    fetch: app.fetch,
    port,
    hostname,
  })
}

main()
