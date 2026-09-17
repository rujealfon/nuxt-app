import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../database/schema'

let db: NodePgDatabase<typeof schema> | undefined
let pool: Pool | undefined

function usesNeon(): boolean {
  const config = useRuntimeConfig()
  return config.databaseDriver === 'neon' || config.databaseUrl.includes('neon.tech')
}

function createDb(): NodePgDatabase<typeof schema> {
  const config = useRuntimeConfig()

  if (usesNeon()) {
    // HTTP driver: no TCP pool, ideal for serverless. No transaction support.
    return drizzleNeon(neon(config.databaseUrl), {
      schema,
      casing: 'snake_case',
    }) as unknown as NodePgDatabase<typeof schema>
  }

  pool ??= new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    allowExitOnIdle: true,
  })

  return drizzlePg(pool, { schema, casing: 'snake_case' })
}

export function useDb(): NodePgDatabase<typeof schema> {
  db ??= createDb()
  return db
}
