import type { Database, DbHandle } from './db-core'
import { useRuntimeConfig } from 'nitropack/runtime'
import { createDb, parseDriver } from './db-core'

let handle: DbHandle | undefined

function dbHandle(): DbHandle {
  if (!handle) {
    const config = useRuntimeConfig()
    handle = createDb({ url: config.databaseUrl, driver: parseDriver(config.databaseDriver) })
  }

  return handle
}

export function useDb(): Database {
  return dbHandle().db
}

export function withTransaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
  return dbHandle().withTransaction(fn)
}
