import { describe, expect, it, vi } from 'vitest'
import { DomainFailure } from '../utils/domain-failure'

const h3 = vi.hoisted(() => ({ defineEventHandler: vi.fn((handler: unknown) => handler) }))

vi.mock('h3', () => ({ defineEventHandler: h3.defineEventHandler }))

const handler = (await import('./[...slug]')).default as unknown as (event: unknown) => unknown

describe('get /api/* catch-all', () => {
  it('throws a not_found domain failure', () => {
    let caught: unknown

    try {
      handler({})
    }
    catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(DomainFailure)
    expect((caught as DomainFailure).error).toBe('not_found')
  })
})
