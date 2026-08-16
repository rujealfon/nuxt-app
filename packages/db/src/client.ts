import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import { resolveDatabaseUrl } from './url'

export const pool = new Pool({ connectionString: resolveDatabaseUrl() })

export const db = drizzle({ client: pool, schema })
