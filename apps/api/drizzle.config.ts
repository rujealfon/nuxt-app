import { defineConfig } from 'drizzle-kit'

try {
  process.loadEnvFile()
}
catch {
  // .env is optional; fall back to the process environment.
}

const url = process.env.DATABASE_URL

if (!url) {
  throw new Error('DATABASE_URL is required (set it in apps/api/.env)')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  casing: 'snake_case',
  strict: true,
  verbose: true,
  dbCredentials: {
    url,
  },
})
