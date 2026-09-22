import { describe, expect, it, vi } from 'vitest'

const h3 = vi.hoisted(() => ({ defineEventHandler: vi.fn((handler: unknown) => handler) }))

vi.mock('h3', () => ({ defineEventHandler: h3.defineEventHandler }))

interface VersionRegistry {
  current: string
  versions: Array<{ version: string, deprecated: boolean, sunset?: string }>
}

const handler = (await import('./index.get')).default as unknown as (event: unknown) => VersionRegistry

describe('get /api', () => {
  it('reports the version registry', () => {
    const registry = handler({})

    expect(registry.current).toBe('v1')
    expect(registry.versions).toEqual([{ version: 'v1', deprecated: false }])
  })
})
