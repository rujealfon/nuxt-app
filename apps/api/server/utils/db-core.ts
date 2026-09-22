import type { NeonHttpQueryResultHKT } from 'drizzle-orm/neon-http'
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres'
import type { PgDatabase } from 'drizzle-orm/pg-core'
import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../database/schema'

// Framework-free database construction, shared by the Nitro runtime (`useDb`
// in `db.ts`) and the CLI scripts (`seed.ts`, `better-auth.config.ts`). It must
// not import `nitropack/runtime`: those scripts run outside Nitro, where the
// package's virtual `#nitro-internal-virtual/*` modules do not resolve.

// The database interface callers see: the query methods both drivers implement.
// The neon-http driver declares `.transaction()` but throws at runtime, so
// transactions stay off this type. Use `withTransaction`, which throws when the
// driver cannot support one.
export type Database = Omit<
  PgDatabase<NodePgQueryResultHKT | NeonHttpQueryResultHKT, typeof schema>,
  'transaction'
>

export type DatabaseDriver = 'pg' | 'neon'

export interface DbConfig {
  url: string
  driver?: DatabaseDriver
}

// Narrows an untrusted driver value (env var, runtime config) to a driver.
// Anything else defers to host-based detection in `selectDriver`.
export function parseDriver(value: unknown): DatabaseDriver | undefined {
  return value === 'pg' || value === 'neon' ? value : undefined
}

export interface DbHandle {
  db: Database
  withTransaction: <T>(fn: (tx: Database) => Promise<T>) => Promise<T>
}

function neonHostname(url: string): boolean {
  try {
    // Hostnames are case-insensitive; `postgres:` is a non-special URL scheme
    // so the URL parser preserves the case as written.
    const host = new URL(url).hostname.toLowerCase()
    return host === 'neon.tech' || host.endsWith('.neon.tech')
  }
  catch {
    return false
  }
}

export function selectDriver(config: DbConfig): DatabaseDriver {
  return config.driver ?? (neonHostname(config.url) ? 'neon' : 'pg')
}

// Driver selection is `selectDriver`; this only constructs the matching client.
export function createDb(config: DbConfig): DbHandle {
  if (selectDriver(config) === 'neon') {
    return {
      db: drizzleNeon(neon(config.url), { schema, casing: 'snake_case' }),
      withTransaction: () => Promise.reject(
        new Error('Transactions are not supported by the neon-http driver'),
      ),
    }
  }

  // The pg driver uses a TCP pool and supports interactive transactions.
  const db = drizzlePg(new Pool({
    connectionString: config.url,
    max: 10,
    allowExitOnIdle: true,
  }), { schema, casing: 'snake_case' })

  return {
    db,
    withTransaction: <T>(fn: (tx: Database) => Promise<T>) => db.transaction(tx => fn(tx)),
  }
}
