import { describe, expect, it } from 'vitest'
import { matchesRequiredRole } from '../src/access'

const user = { id: 'u1', email: 'a@b.c', name: 'Ada', role: 'user' as const }
const admin = { ...user, role: 'admin' as const }

describe('matchesRequiredRole', () => {
  it('allows any role when none is required', () => {
    expect(matchesRequiredRole(user)).toBe(true)
    expect(matchesRequiredRole(admin)).toBe(true)
  })

  it('requires an exact role match', () => {
    expect(matchesRequiredRole(user, 'admin')).toBe(false)
    expect(matchesRequiredRole(admin, 'admin')).toBe(true)
  })
})
