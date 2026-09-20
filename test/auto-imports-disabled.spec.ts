import { describe, expect, it, vi } from 'vitest'

// The Nuxt configs call the globally provided `defineNuxtConfig`; stub it so the
// modules can be imported in a plain node environment and inspected.
vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)

// Loaded through a runtime path so the root TypeScript project does not pull the
// app configs (and the Nuxt module augmentations they rely on) into its program;
// each app type-checks its own `nuxt.config.ts`.
async function loadConfig(path: string) {
  return (await import(/* @vite-ignore */ path)).default
}

const web = await loadConfig('../apps/web/nuxt.config')
const app = await loadConfig('../apps/app/nuxt.config')
const admin = await loadConfig('../apps/admin/nuxt.config')
const api = await loadConfig('../apps/api/nuxt.config')
const ui = await loadConfig('../packages/ui/nuxt.config')

describe('auto-imports disabled', () => {
  it('disables Nuxt auto-imports in every app', () => {
    for (const config of [web, app, admin, api]) {
      expect(config.imports?.autoImport).toBe(false)
    }
  })

  it('disables component auto-imports in every Vue app and the UI layer', () => {
    for (const config of [web, app, admin, ui]) {
      expect(config.components?.dirs).toEqual([])
    }
  })
})
