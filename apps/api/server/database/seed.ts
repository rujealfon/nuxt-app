import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { createAuth } from './auth'
import * as schema from './schema'
import { user } from './schema'

try {
  process.loadEnvFile()
}
catch {
  // .env is optional; fall back to the process environment.
}

const email = process.env.SEED_EMAIL || 'dev@mysite.com'
const password = process.env.SEED_PASSWORD || 'password123'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required (set it in apps/api/.env)')
}

const pool = new Pool({ connectionString })
const db = drizzle(pool, { schema, casing: 'snake_case' })

async function main() {
  const auth = createAuth(db, {
    secret: process.env.BETTER_AUTH_SECRET ?? '',
    baseURL: process.env.BETTER_AUTH_URL ?? '',
  })

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1)

  if (existing) {
    // Cascades to the user's accounts and sessions.
    await db.delete(user).where(eq(user.id, existing.id))
  }

  await auth.api.signUpEmail({ body: { email, password, name: 'Dev' } })
  await db.update(user).set({ role: 'admin' }).where(eq(user.email, email))

  console.log(`Seeded admin user: ${email}`)

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
