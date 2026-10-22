import type { Database, DbHandle, RawDatabase } from './db-core'
import { useRuntimeConfig } from 'nitropack/runtime'
import { createDb } from './db-core'
import { useLogger } from './logger'

let handle: DbHandle | undefined

function dbHandle(): DbHandle {
  if (!handle) {
    const config = useRuntimeConfig()
    handle = createDb({
      url: config.databaseUrl,
      onError: error => useLogger().error({ err: error }, 'idle database client error'),
    })
  }

  return handle
}

export function useDb(): Database {
  return dbHandle().db
}

// The full Drizzle client for Better Auth's adapter only (`utils/auth.ts`).
// Anything else uses `useDb()` and `withTransaction`.
export function useRawDb(): RawDatabase {
  return dbHandle().rawDb
}

export function withTransaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
  return dbHandle().withTransaction(fn)
}
