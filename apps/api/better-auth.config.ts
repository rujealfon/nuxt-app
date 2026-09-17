import { createAuth } from './server/database/auth'
import { createDb } from './server/utils/db'

try {
  process.loadEnvFile()
}
catch {
  // .env is optional; fall back to the process environment.
}

// Config used only by the Better Auth CLI (`pnpm db:auth:generate`) to emit the
// Drizzle schema/migration. Runtime auth lives in `server/utils/auth.ts`.
export const auth = createAuth(
  createDb({
    url: process.env.DATABASE_URL ?? '',
    driver: process.env.DATABASE_DRIVER,
  }).db,
  {
    secret: process.env.BETTER_AUTH_SECRET ?? '',
    baseURL: process.env.BETTER_AUTH_URL ?? '',
  },
)
