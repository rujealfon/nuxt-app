import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { createAuth } from './server/database/auth'
import * as schema from './server/database/schema'

try {
  process.loadEnvFile()
}
catch {
  // .env is optional; fall back to the process environment.
}

// Config used only by the Better Auth CLI (`pnpm db:auth:generate`) to emit the
// Drizzle schema/migration. Runtime auth lives in `server/utils/auth.ts`.
export const auth = createAuth(
  drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), {
    schema,
    casing: 'snake_case',
  }),
  {
    secret: process.env.BETTER_AUTH_SECRET ?? '',
    baseURL: process.env.BETTER_AUTH_URL ?? '',
  },
)
