import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '#server/database/schema'

// Framework-free database construction, shared by the Nitro runtime (`useDb`
// in `db.ts`) and the CLI scripts (`seed.ts`, `better-auth.config.ts`). It must
// not import `nitropack/runtime`: those scripts run outside Nitro, where the
// package's virtual `#nitro-internal-virtual/*` modules do not resolve.

// The full Drizzle client. Only Better Auth's adapter, `seed.ts` and
// `better-auth.config.ts` take it (through `DbHandle.rawDb`); everything else
// uses `Database`.
export type RawDatabase = NodePgDatabase<typeof schema>

// What services and handlers see: the client without `.transaction()`. The only
// way to run a transaction is `withTransaction(fn)`, whose `tx` is a `Database`
// too, so a transaction cannot be nested through the public type. See
// docs/adr/0002-database-capability-seam.md.
export type Database = Omit<RawDatabase, 'transaction'>

export interface DbConfig {
  url: string
  // Called when an idle pool client errors (a Postgres restart, a dropped
  // connection). `pg` emits that as an `error` event on the pool, and an
  // unhandled one crashes the process. Defaults to `console.error`; the Nitro
  // runtime passes its logger (`db.ts`), since this module stays framework-free.
  onError?: (error: Error) => void
}

export interface DbHandle {
  db: Database
  rawDb: RawDatabase
  withTransaction: <T>(fn: (tx: Database) => Promise<T>) => Promise<T>
}

function logIdleClientError(error: Error): void {
  console.error('Idle database client error', error)
}

export function createDb(config: DbConfig): DbHandle {
  const pool = new Pool({
    connectionString: config.url,
    max: 10,
    allowExitOnIdle: true,
    // Fail an acquire that waits this long instead of hanging the request.
    connectionTimeoutMillis: 10_000,
  })
  const onError = config.onError ?? logIdleClientError

  // A listener keeps a failed idle client from becoming an uncaught exception;
  // the pool discards that client and opens a new one on the next query.
  pool.on('error', onError)

  const rawDb = drizzle(pool, { schema, casing: 'snake_case' })

  return {
    db: rawDb,
    rawDb,
    withTransaction: <T>(fn: (tx: Database) => Promise<T>) => rawDb.transaction(tx => fn(tx)),
  }
}
