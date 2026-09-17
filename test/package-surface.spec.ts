import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))

// The authored public surface of each layer: every composable and component a
// layer publishes to apps through Nuxt's auto-imports. Compared with exact
// equality — adding or renaming a public symbol must update this list
// deliberately, so nothing joins the interface by accident.
const clientComposables = ['useApi', 'useAuth']
const uiComposables = ['useSite']
const uiComponents = ['AppHeader', 'AppShell', 'AuthScreen', 'LoadMoreButton', 'PageNumberPagination']

function exportedSymbols(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts'))
    .flatMap((entry) => {
      const source = readFileSync(`${dir}/${entry.name}`, 'utf8')
      return [...source.matchAll(/export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)\s*=/g)]
        .map(match => (match[1] ?? match[2]) as string)
    })
    .sort()
}

function componentNames(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.vue'))
    .map(entry => entry.name.replace(/\.vue$/, ''))
    .sort()
}

describe('package public surface', () => {
  it('publishes exactly the authored client composables', () => {
    expect(exportedSymbols(`${root}/packages/client/app/composables`)).toEqual(clientComposables)
  })

  it('publishes exactly the authored ui surface', () => {
    expect(exportedSymbols(`${root}/packages/ui/app/composables`)).toEqual(uiComposables)
    expect(componentNames(`${root}/packages/ui/app/components`)).toEqual(uiComponents)
  })
})
