import app from '@api/app.js'
import { env } from '@api/env.js'
import { serve } from '@hono/node-server'
import { runMigrations } from '@nuxt-app/db'

const port = env.API_PORT
const hostname = env.API_HOST

async function main() {
  await runMigrations()

  const host = hostname === '0.0.0.0' ? 'localhost' : hostname
  // eslint-disable-next-line no-console
  console.log(`API running on http://${host}:${port}`)
  if (env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`Scalar docs at http://${host}:${port}/`)
  }

  serve({
    fetch: app.fetch,
    port,
    hostname,
  })
}

main()
