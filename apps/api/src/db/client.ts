import process from 'node:process'
import * as schema from '@api/db/schema'
import { resolveDatabaseUrl } from '@api/db/url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const vercelInstance = Boolean(process.env.VERCEL)

export const pool = new Pool({
  connectionString: resolveDatabaseUrl(),
  // Many Vercel instances; keep each pool small so we do not exhaust Postgres.
  max: vercelInstance ? 5 : 10,
})

export const db = drizzle({ client: pool, schema })
