/* eslint-disable no-console */
/**
 * Create an admin user.
 * Run: ADMIN_PASSWORD=... pnpm --filter @nuxt-app/api db:seed
 */
import process from 'node:process'
import { db, pool, users } from '@api/db'
import { createUser } from '@api/modules/auth/service.js'
import { registerSchema } from '@nuxt-app/types'
import { eq } from 'drizzle-orm'

export function resolveAdminSeedPassword(env: NodeJS.Dict<string> = process.env): string {
  const password = env.ADMIN_PASSWORD?.trim()
  if (!password) {
    throw new Error(
      'ADMIN_PASSWORD is required to create an admin user. Set it explicitly, e.g. ADMIN_PASSWORD=... pnpm db:seed',
    )
  }

  const parsed = registerSchema.shape.password.safeParse(password)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'ADMIN_PASSWORD is invalid')
  }

  return parsed.data
}

export async function seed(env: NodeJS.Dict<string> = process.env) {
  const email = env.ADMIN_EMAIL || 'admin@nuxt-app.com'
  const name = env.ADMIN_NAME || 'Admin'

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  })

  if (existing) {
    console.log(`User ${email} already exists (role: ${existing.role})`)
    if (existing.role !== 'admin') {
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, existing.id))

      console.log('Promoted to admin.')
    }
    return
  }

  const password = resolveAdminSeedPassword(env)

  const user = await createUser({
    email,
    password,
    name,
    role: 'admin',
  })

  if (!user) {
    console.log(`User ${email} already exists`)
    return
  }

  console.log('Admin user created:')
  console.log(`  Email:    ${user.email}`)
  console.log(`  Role:     ${user.role}`)
}

const invokedDirectly = process.argv[1]?.endsWith('seed.ts')
if (invokedDirectly) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
