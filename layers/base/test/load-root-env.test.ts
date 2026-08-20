import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { loadRootEnv } from '../load-root-env'

describe('loadRootEnv', () => {
  it('is a no-op under Vitest so Nuxt config reload does not loop', () => {
    expect(process.env.VITEST).toBeTruthy()
    expect(() => loadRootEnv()).not.toThrow()
  })
})
