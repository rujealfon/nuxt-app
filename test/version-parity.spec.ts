import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { apiVersions, versionedOperations } from '../packages/config/index'
import * as types from '../packages/types/src/index'

const apiRoot = fileURLToPath(new URL('../apps/api/server/api', import.meta.url))
const methodSuffix = /\.(get|put|post|delete|patch|options|head)\.ts$/

function versionedHandlers() {
  const found: { version: string, suffix: string, method: string }[] = []

  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)

      if (entry.isDirectory()) {
        walk(full)
        continue
      }

      const match = entry.name.match(methodSuffix)
      if (!match) {
        continue
      }

      const rel = relative(apiRoot, full).replaceAll('\\', '/')
      const [version, ...rest] = rel.split('/')

      if (!version || !/^v\d+$/.test(version) || rest.length === 0) {
        continue
      }

      const routeFile = rest.join('/').replace(methodSuffix, '')
      const suffix = `/${routeFile.replace(/\[([^\]]+)\]/g, '{$1}')}`

      found.push({ version, suffix, method: match[1] })
    }
  }

  walk(apiRoot)
  return found
}

// The registry declares versions; `@nuxt-app/types` contracts them. Neither
// may drift without the other, so these cross-checks are the seam.
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

  it('documents every versioned-route handler', () => {
    const documented = new Set(
      apiVersions.flatMap(version =>
        versionedOperations[version].map(operation => `${version}\t${operation.method}\t${operation.suffix}`),
      ),
    )

    const handlers = new Set(
      versionedHandlers().map(handler => `${handler.version}\t${handler.method}\t${handler.suffix}`),
    )

    expect(handlers).toEqual(documented)
  })
})
