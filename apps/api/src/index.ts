import app from '@api/app.js'
import { env } from '@api/env.js'
import { serve } from '@hono/node-server'
import { runMigrations } from '@nuxt-app/db'

const port = env.API_PORT
const hostname = env.API_HOST

async function main() {
  await runMigrations()

  // eslint-disable-next-line no-console
  console.log(`API running on http://${hostname}:${port}`)

  serve({
    fetch: app.fetch,
    port,
    hostname,
  })
}

main()
