import { describe, expect, it, vi } from 'vitest'

// The Nuxt configs call the globally provided `defineNuxtConfig`; stub it so the
// modules can be imported in a plain node environment and inspected.
vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)

const web = (await import('../apps/web/nuxt.config')).default
const app = (await import('../apps/app/nuxt.config')).default
const admin = (await import('../apps/admin/nuxt.config')).default
const api = (await import('../apps/api/nuxt.config')).default
const ui = (await import('../packages/ui/nuxt.config')).default

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
