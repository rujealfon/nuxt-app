import { describe, expect, it, vi } from 'vitest'

const h3 = vi.hoisted(() => ({ defineEventHandler: vi.fn((handler: unknown) => handler) }))

vi.mock('h3', () => ({ defineEventHandler: h3.defineEventHandler }))

interface HealthResponse {
  status: string
  service: string
  timestamp: string
}

const handler = (await import('./health.get')).default as unknown as (event: unknown) => HealthResponse

describe('get /api/health', () => {
  it('reports liveness with an ISO timestamp', () => {
    const body = handler({})

    expect(body).toMatchObject({ status: 'ok', service: 'api.nuxt-app.com' })
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })
})
