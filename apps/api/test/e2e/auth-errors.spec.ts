import { fileURLToPath } from 'node:url'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

// These cases fail the shared request schema before Better Auth (or its Redis
// rate limiter, or the database) is reached, so the suite needs no services.
describe('auth error contract', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    build: true,
  })

  it('returns invalid_input with field details for a bad registration body', async () => {
    const response = await fetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'not-an-email', password: '' }),
    })

    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toMatch(/json/)
    await expect(response.json()).resolves.toEqual({
      error: 'invalid_input',
      message: 'The request was invalid',
      details: [
        { path: ['name'], message: 'Name is required' },
        { path: ['email'], message: 'Enter a valid email address' },
        { path: ['password'], message: 'Password must be at least 8 characters' },
      ],
    })
  })

  it('returns invalid_input with field details for a bad sign-in body', async () => {
    const response = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nope', password: '' }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'invalid_input',
      message: 'The request was invalid',
      details: [
        { path: ['email'], message: 'Enter a valid email address' },
        { path: ['password'], message: 'Password is required' },
      ],
    })
  })
})
