import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://nuxt_app_user:nuxt_app_password@localhost:55432/nuxt_app_db',
  },
})
