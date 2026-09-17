import { describe, expect, it } from 'vitest'
import { apiVersions } from '../packages/config/index'
import * as types from '../packages/types/src/index'

// The registry declares versions; `@nuxt-app/types` contracts them. Neither
// may drift without the other — these cross-checks are the seam.
describe('version parity', () => {
  it('ships a contract namespace for every registered version', () => {
    for (const version of apiVersions) {
      expect(types[version], `missing @nuxt-app/types contract for ${version}`).toBeDefined()
    }
  })

  it('registers every contract namespace', () => {
    const namespaces = Object.keys(types).filter(key => /^v\d+$/.test(key))

    expect(new Set(namespaces)).toEqual(new Set(apiVersions))
  })
})
