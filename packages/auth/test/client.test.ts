import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authClient, setAuthApiUrl } from '../src/client'

const user = {
  id: 'V1StGXR8_Z5jdHi6B-myT',
  email: 'ada@example.com',
  name: 'Ada',
  role: 'user' as const,
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('authClient', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    setAuthApiUrl('http://localhost:3001')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts login with credentials and returns the user', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user, message: 'ok' }))

    const result = await authClient.login({
      email: 'ada@example.com',
      password: 'password12',
    })

    expect(result.user).toEqual(user)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toContain('http://localhost:3001/auth/login')
    expect(init.credentials).toBe('include')
    expect(init.method?.toUpperCase()).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'ada@example.com',
      password: 'password12',
    })
  })

  it('uses the overridden API origin', async () => {
    setAuthApiUrl('https://api.example.com')
    fetchMock.mockResolvedValue(jsonResponse(200, { user }))

    await authClient.login({ email: 'ada@example.com', password: 'password12' })

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(String(url)).toContain('https://api.example.com/auth/login')
  })

  it('throws the first validation issue from a failed login', async () => {
    fetchMock.mockResolvedValue(jsonResponse(422, {
      error: { issues: [{ message: 'Email and password are required' }] },
    }))

    await expect(authClient.login({ email: '', password: '' }))
      .rejects
      .toThrow('Email and password are required')
  })

  it('throws the message field when the API returns one', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Invalid credentials' }))

    await expect(authClient.login({ email: 'ada@example.com', password: 'nope' }))
      .rejects
      .toThrow('Invalid credentials')
  })

  it('posts register and returns the success message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { message: 'Registered successfully' }))

    await expect(authClient.register({
      email: 'ada@example.com',
      password: 'password12',
      name: 'Ada',
    })).resolves.toEqual({ message: 'Registered successfully' })

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(String(url)).toContain('/auth/register')
  })

  it('posts logout', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { message: 'Logged out' }))

    await expect(authClient.logout()).resolves.toEqual({ message: 'Logged out' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toContain('/auth/logout')
    expect(init.credentials).toBe('include')
  })

  it('returns the current user from me', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user }))

    await expect(authClient.me()).resolves.toEqual({ user })
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(String(url)).toContain('/auth/me')
  })

  it('returns a null user when me succeeds without a session', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: null }))

    await expect(authClient.me()).resolves.toEqual({ user: null })
  })

  it('throws when me returns a server error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { message: 'boom' }))

    await expect(authClient.me()).rejects.toThrow('boom')
  })

  it('throws when me cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    await expect(authClient.me()).rejects.toThrow('network down')
  })
})
