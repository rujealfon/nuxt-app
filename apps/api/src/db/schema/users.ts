import { USER_ROLES } from '@nuxt-app/types'
import { sql } from 'drizzle-orm'
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const userRole = pgEnum('user_role', USER_ROLES)

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`uuidv7()`),
  publicId: text('public_id').notNull().unique().default(sql`nanoid()`),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
})
