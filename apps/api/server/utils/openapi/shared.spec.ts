import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { toJsonSchema } from './shared'

describe('toJsonSchema', () => {
  it('renders Date contracts as ISO date-time strings', () => {
    expect(toJsonSchema(z.date())).toEqual({ type: 'string', format: 'date-time' })
    expect(toJsonSchema(z.coerce.date())).toEqual({ type: 'string', format: 'date-time' })
  })

  it('keeps throwing for unrepresentable non-date types', () => {
    expect(() => toJsonSchema(z.bigint())).toThrow(/BigInt cannot be represented/)
  })
})
