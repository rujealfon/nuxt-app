/**
 * Simple seed script to create an admin user.
 * Run: pnpm tsx src/db/seed.ts
 */
import { createUser } from '../lib/auth'
import { db } from './index'
import { users } from './schema'
import { eq } from 'drizzle-orm'

async function seed() {
  const email = process.env.ADMIN_EMAIL || 'admin@mysite.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123456'
  const name = process.env.ADMIN_NAME || 'Admin'

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

  const user = await createUser({
    email,
    password,
    name,
    role: 'admin',
  })

  console.log('Admin user created:')
  console.log(`  Email:    ${user.email}`)
  console.log(`  Password: ${password}`)
  console.log(`  Role:     ${user.role}`)
}

seed().catch(console.error)
