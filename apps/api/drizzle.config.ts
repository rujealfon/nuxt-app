import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'drizzle-kit'
import { applyEnvFiles } from '../../layers/base/apply-env-files'

applyEnvFiles([
  resolve(process.cwd(), '../../.env'),
  resolve(process.cwd(), '.env'),
])

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://nuxt:nuxt@localhost:5433/nuxt_app',
  },
})
