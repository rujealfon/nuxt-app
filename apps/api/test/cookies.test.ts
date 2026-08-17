import { sessionCookieOptions } from '@api/modules/auth/cookies.js'
import { describe, expect, it } from 'vitest'

describe('sessionCookieOptions', () => {
  it('uses first-party SameSite=Lax; Secure in production without COOKIE_DOMAIN', () => {
    expect(sessionCookieOptions({ nodeEnv: 'production' })).toMatchObject({
      sameSite: 'Lax',
      secure: true,
      httpOnly: true,
      path: '/',
    })
  })

  it('uses SameSite=Lax when COOKIE_DOMAIN ties sibling hosts', () => {
    expect(sessionCookieOptions({
      nodeEnv: 'production',
      cookieDomain: '.nuxt-app.com',
    })).toMatchObject({
      sameSite: 'Lax',
      secure: true,
      domain: '.nuxt-app.com',
    })
  })

  it('uses SameSite=Lax without Secure in development', () => {
    expect(sessionCookieOptions({
      nodeEnv: 'development',
      cookieDomain: 'localhost',
    })).toMatchObject({
      sameSite: 'Lax',
      secure: false,
      domain: 'localhost',
    })
  })
})
