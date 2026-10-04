import { randomUUID } from 'node:crypto'
import { connect } from 'node:net'
import Redis from 'ioredis'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { rateLimitConsumeScript } from './rate-limit'
import { redisClientOptions } from './redis'

// Loading `redis.ts` pulls in `nitropack/runtime`. This Node project cannot resolve that export.
vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => ({ redisUrl: '' }),
}))

const redisHost = '127.0.0.1'
const redisPort = 6381
const redisUrl = `redis://${redisHost}:${redisPort}`

function redisPortOpen(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: redisHost, port: redisPort })
    let settled = false
    const finish = (open: boolean) => {
      if (settled) {
        return
      }
      settled = true
      socket.destroy()
      resolve(open)
    }
    socket.setTimeout(300)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

const redisReachable = await redisPortOpen()

if (!redisReachable && process.env.CI === 'true') {
  throw new Error('Redis 8 must be listening on 127.0.0.1:6381')
}

describe.skipIf(!redisReachable)('redis reply shapes', () => {
  let client: Redis

  beforeAll(() => {
    client = new Redis(redisUrl, redisClientOptions)
  })

  afterAll(async () => {
    await client?.quit()
  })

  it('returns PONG from ping', async () => {
    await expect(client.ping()).resolves.toBe('PONG')
  })

  it('returns a two-number array from the rate-limit script', async () => {
    const key = `rate-limit:protocol-spec:${randomUUID()}`
    const windowMs = 60_000

    try {
      const first = await client.eval(rateLimitConsumeScript, 1, key, windowMs)
      const [firstCount, firstTtl] = countAndTtl(first)
      expect(firstCount).toBe(1)
      expect(firstTtl).toBeGreaterThan(0)
      expect(firstTtl).toBeLessThanOrEqual(windowMs)

      const second = await client.eval(rateLimitConsumeScript, 1, key, windowMs)
      const [secondCount, secondTtl] = countAndTtl(second)
      expect(secondCount).toBe(2)
      expect(secondTtl).toBeGreaterThan(0)
      expect(secondTtl).toBeLessThanOrEqual(windowMs)
    }
    finally {
      await client.del(key)
    }
  })
})

function countAndTtl(reply: unknown): [number, number] {
  expect(Array.isArray(reply)).toBe(true)
  expect(reply).toHaveLength(2)
  const [count, ttl] = reply as [unknown, unknown]
  expect(count).toEqual(expect.any(Number))
  expect(ttl).toEqual(expect.any(Number))
  return [count as number, ttl as number]
}
