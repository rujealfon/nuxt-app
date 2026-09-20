import { readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

// The composable modules import Nuxt/Nitro virtuals at module scope; stub them
// so this node-environment export check can read the modules' exports.
vi.mock('#imports', () => ({
  $fetch: Object.assign(vi.fn(), { create: vi.fn(() => vi.fn()) }),
  navigateTo: vi.fn(),
  useRuntimeConfig: vi.fn(() => ({ public: {} })),
}))

const root = fileURLToPath(new URL('..', import.meta.url))

// The authored public exports of each layer: every composable and component a
// layer publishes to apps. Compared with exact equality, so adding or renaming
// a public symbol must update this list deliberately, and nothing joins the
// interface by accident.
const clientComposables = ['useApi', 'useAuth', 'useAuthForm']
const uiComposables = ['useSite']
const uiComponents = ['AppHeader', 'AppShell', 'AuthScreen']

// Import each module and read its runtime exports, so the check sees every
// export form (declarations, re-exports) instead of guessing with a regex.
async function exportedSymbols(dir: string): Promise<string[]> {
  const files = readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts'))

  const names = new Set<string>()

  for (const file of files) {
    const module = await import(pathToFileURL(`${dir}/${file.name}`).href)

    for (const [name, value] of Object.entries(module)) {
      if (name !== 'default' && typeof value === 'function') {
        names.add(name)
      }
    }
  }

  return [...names].sort()
}

function componentNames(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.vue'))
    .map(entry => entry.name.replace(/\.vue$/, ''))
    .sort()
}

describe('package public exports', () => {
  it('publishes exactly the authored client composables', async () => {
    expect(await exportedSymbols(`${root}/packages/client/app/composables`)).toEqual(clientComposables)
  })

  it('publishes exactly the authored ui exports', async () => {
    expect(await exportedSymbols(`${root}/packages/ui/app/composables`)).toEqual(uiComposables)
    expect(componentNames(`${root}/packages/ui/app/components`)).toEqual(uiComponents)
  })
})
