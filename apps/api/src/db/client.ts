import * as schema from '@api/db/schema'
import { resolveDatabaseUrl } from '@api/db/url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

export const pool = new Pool({ connectionString: resolveDatabaseUrl() })

export const db = drizzle({ client: pool, schema })
