import { hash } from '@node-rs/argon2'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { users } from './schema'

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
const db = drizzle(pool, { casing: 'snake_case' })

async function main() {
  const passwordHash = await hash(password)
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (existing.length) {
    await db.update(users).set({ passwordHash }).where(eq(users.email, email))
    console.log(`Updated seed user: ${email}`)
  }
  else {
    await db.insert(users).values({ email, name: 'Dev', passwordHash, roles: ['user'] })
    console.log(`Created seed user: ${email}`)
  }

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
