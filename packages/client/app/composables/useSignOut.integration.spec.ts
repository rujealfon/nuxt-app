import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRuntimeConfig } from '#imports'
import { AuthRequestError } from '../lib/authError'
import { useSignOut } from './useSignOut'

const { navigate, fetch } = vi.hoisted(() => ({ navigate: vi.fn(), fetch: vi.fn() }))
mockNuxtImport('navigateTo', () => navigate)

beforeEach(() => {
  useRuntimeConfig().public.sessionTransport = 'cookie'
  navigate.mockReset()
  navigate.mockResolvedValue(undefined)
  fetch.mockReset()
  vi.stubGlobal('fetch', fetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cookie logout with the real auth client', () => {
  it.each([
    [429, 'rate_limited'],
    [500, 'internal_error'],
  ])('keeps the current page when HTTP %i rejects revocation', async (status, code) => {
    fetch.mockImplementation(async () => new Response(JSON.stringify({
      error: code,
      message: 'Sign-out failed. Please try again.',
    }), { status, headers: { 'content-type': 'application/json' } }))
    const { signOut, isSigningOut } = useSignOut('/login')

    await expect(signOut()).rejects.toBeInstanceOf(AuthRequestError)

    expect(fetch).toHaveBeenCalledOnce()
    expect(String(fetch.mock.calls[0]?.[0])).toBe('http://api.test/api/auth/sign-out')
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', credentials: 'include' })
    expect(navigate).not.toHaveBeenCalled()
    expect(isSigningOut.value).toBe(false)
  })

  it('returns to login when the server confirms sign-out', async () => {
    fetch.mockImplementation(async () => new Response(JSON.stringify({
      success: true,
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const { signOut, isSigningOut } = useSignOut('/login')

    await expect(signOut()).resolves.toBeUndefined()

    expect(navigate).toHaveBeenCalledWith('/login')
    expect(isSigningOut.value).toBe(false)
  })
})
