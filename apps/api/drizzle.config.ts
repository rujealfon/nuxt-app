import process from 'node:process'
import { defineConfig } from 'drizzle-kit'
import { loadEnv } from './src/load-env.ts'

loadEnv()

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED
      ?? process.env.DATABASE_URL
      ?? 'postgres://nuxt_app_postgres_user:nuxt_app_postgres_password@localhost:5433/nuxt_app_db',
  },
})
