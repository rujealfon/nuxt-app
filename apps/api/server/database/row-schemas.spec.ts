import { getTableColumns } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { toJsonSchema } from '#server/utils/openapi/shared'
import { user } from './auth-schema'
import { selectUserSchema } from './row-schemas'

const userRow = {
  id: 'u_1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerified: true,
  image: null,
  role: 'user',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('selectUserSchema', () => {
  it('derives one field per table column', () => {
    expect(Object.keys(selectUserSchema.shape)).toEqual(Object.keys(getTableColumns(user)))
  })

  it('accepts a user row as a JSON payload', () => {
    expect(selectUserSchema.parse(userRow)).toEqual(userRow)
  })

  it('requires ISO timestamps rather than Date instances', () => {
    expect(selectUserSchema.safeParse({
      ...userRow,
      createdAt: new Date(userRow.createdAt),
    }).success).toBe(false)
  })

  it('rejects a payload missing a column', () => {
    expect(selectUserSchema.safeParse({ ...userRow, email: undefined }).success).toBe(false)
  })

  it('rejects wrong types', () => {
    expect(selectUserSchema.safeParse({ ...userRow, emailVerified: 'yes' }).success).toBe(false)
  })

  it('keeps every field JSON-shaped, so future columns cannot emit Date schemas', () => {
    const fieldTypes = Object.values(selectUserSchema.shape).map(
      field => field._zod.def.type as string,
    )
    expect(fieldTypes).not.toContain('date')
  })

  it('converts to the OpenAPI document schema', () => {
    expect(toJsonSchema(selectUserSchema)).toMatchObject({
      type: 'object',
      properties: {
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    })
  })
})
