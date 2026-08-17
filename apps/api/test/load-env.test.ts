import process from 'node:process'
import { env } from '@api/env.js'
import { loadEnv } from '@api/load-env.js'
import { describe, expect, it } from 'vitest'

describe('loadEnv', () => {
  it('does not override an already-set process env value', () => {
    const previous = process.env.APP_URL
    process.env.APP_URL = 'https://already-set.example'
    loadEnv()
    expect(process.env.APP_URL).toBe('https://already-set.example')
    if (previous === undefined)
      delete process.env.APP_URL
    else
      process.env.APP_URL = previous
  })
})

describe('env', () => {
  it('uses the root .env APP_URL when present', () => {
    expect(env.APP_URL).toBe(process.env.APP_URL ?? 'http://localhost:3000')
  })
})
