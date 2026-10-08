import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { user } from './auth-schema'

// Row-shaped contracts derived from the tables (drizzle-zod). The table
// definition is the single source of truth for which fields a payload has, so
// a column change flows into the schema instead of drifting from a
// hand-written copy. Payloads are JSON, so the timestamp columns override the
// `Date` their column type would produce: a `z.date()` field rejects the ISO
// strings HTTP payloads carry, and `UserRow` would infer `Date` instead of
// the strings responses carry. Narrowing rules such as length limits attach
// in this derivation, not in the table. Schemas that are not row shapes stay
// hand-written in `@nuxt-app/types`; the auth flow bodies validate client
// form contracts, and Better Auth validates its own copies.
export const selectUserSchema = createSelectSchema(user, {
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type UserRow = z.output<typeof selectUserSchema>
