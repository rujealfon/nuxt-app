import type { AuthUser } from '@nuxt-app/types'
import { describe, expect, it } from 'vitest'
import { resolveRouteAccess } from '../app/utils/routeAccess'

const user: AuthUser = { id: 'u1', email: 'a@b.c', name: 'Ada', role: 'user' }
const admin: AuthUser = { ...user, role: 'admin' }
const to = { fullPath: '/secret' }

describe('resolveRouteAccess', () => {
  it('sends guests to login with a redirect back', () => {
    expect(resolveRouteAccess(null, 'auth', to)).toEqual({
      redirect: { path: '/login', query: { redirect: '/secret' } },
    })
  })

  it('lets an authenticated user through', () => {
    expect(resolveRouteAccess(user, 'auth', to)).toEqual({ allow: true })
  })

  it('lets a guest through guest pages', () => {
    expect(resolveRouteAccess(null, 'guest', to)).toEqual({ allow: true })
  })

  it('sends a signed-in user home from guest pages', () => {
    expect(resolveRouteAccess(user, 'guest', to)).toEqual({ redirect: '/' })
  })

  it('lets a signed-in non-admin through guest-admin so they can switch accounts', () => {
    expect(resolveRouteAccess(user, 'guest-admin', to)).toEqual({ allow: true })
  })

  it('sends a signed-in admin home from guest-admin', () => {
    expect(resolveRouteAccess(admin, 'guest-admin', to)).toEqual({ redirect: '/' })
  })

  it('sends guests to login on admin pages', () => {
    expect(resolveRouteAccess(null, 'admin', to)).toEqual({
      redirect: { path: '/login', query: { redirect: '/secret' } },
    })
  })

  it('sends a signed-in non-admin to login on admin pages', () => {
    expect(resolveRouteAccess(user, 'admin', to)).toEqual({ redirect: '/login' })
  })

  it('lets an admin through', () => {
    expect(resolveRouteAccess(admin, 'admin', to)).toEqual({ allow: true })
  })
})
