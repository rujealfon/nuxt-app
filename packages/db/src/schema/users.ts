import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'

export const userRole = pgEnum('user_role', ['user', 'admin'])

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

export type User = typeof users.$inferSelect

export const selectUserSchema = createSelectSchema(users)
export const authUserSelectSchema = selectUserSchema.pick({
  id: true,
  email: true,
  name: true,
  role: true,
})
