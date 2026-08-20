import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveVercelPreviewUrl } from '../src/vercel-preview-url'

const keys = ['VERCEL_ENV', 'VERCEL_BRANCH_URL'] as const
const saved: Partial<Record<typeof keys[number], string | undefined>> = {}

function setEnv(env: Partial<Record<typeof keys[number], string | undefined>>) {
  for (const key of keys) {
    if (!(key in saved))
      saved[key] = process.env[key]
    const value = env[key]
    if (value === undefined)
      delete process.env[key]
    else
      process.env[key] = value
  }
}

afterEach(() => {
  for (const key of keys) {
    const value = saved[key]
    if (value === undefined)
      delete process.env[key]
    else
      process.env[key] = value
    delete saved[key]
  }
})

describe('resolveVercelPreviewUrl', () => {
  it('is inert outside a Vercel preview', () => {
    setEnv({ VERCEL_ENV: 'production', VERCEL_BRANCH_URL: 'nuxt-app-app-git-main-rujealfon.vercel.app' })
    expect(resolveVercelPreviewUrl('nuxt-app-api')).toBeUndefined()

    setEnv({ VERCEL_ENV: 'development', VERCEL_BRANCH_URL: 'nuxt-app-app-git-main-rujealfon.vercel.app' })
    expect(resolveVercelPreviewUrl('nuxt-app-api')).toBeUndefined()

    setEnv({ VERCEL_ENV: undefined, VERCEL_BRANCH_URL: 'nuxt-app-app-git-feature-x-rujealfon.vercel.app' })
    expect(resolveVercelPreviewUrl('nuxt-app-api')).toBeUndefined()
  })

  it('swaps the project prefix on a team branch URL', () => {
    setEnv({
      VERCEL_ENV: 'preview',
      VERCEL_BRANCH_URL: 'nuxt-app-app-git-feature-vercel-preview-rujealfon.vercel.app',
    })

    expect(resolveVercelPreviewUrl('nuxt-app-api'))
      .toBe('https://nuxt-app-api-git-feature-vercel-preview-rujealfon.vercel.app')
    expect(resolveVercelPreviewUrl('nuxt-app-admin'))
      .toBe('https://nuxt-app-admin-git-feature-vercel-preview-rujealfon.vercel.app')
    expect(resolveVercelPreviewUrl('nuxt-app-web'))
      .toBe('https://nuxt-app-web-git-feature-vercel-preview-rujealfon.vercel.app')
  })

  it('matches Vercel docs hobby example (no team slug)', () => {
    setEnv({
      VERCEL_ENV: 'preview',
      VERCEL_BRANCH_URL: 'my-site-git-improve-about-page.vercel.app',
    })

    expect(resolveVercelPreviewUrl('nuxt-app-api'))
      .toBe('https://nuxt-app-api-git-improve-about-page.vercel.app')
  })

  it('keeps a branch slug that itself contains -git-', () => {
    setEnv({
      VERCEL_ENV: 'preview',
      VERCEL_BRANCH_URL: 'nuxt-app-api-git-fix-git-hooks-rujealfon.vercel.app',
    })

    expect(resolveVercelPreviewUrl('nuxt-app-app'))
      .toBe('https://nuxt-app-app-git-fix-git-hooks-rujealfon.vercel.app')
  })

  it('returns undefined when the branch URL is missing or not a git URL', () => {
    setEnv({ VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: undefined })
    expect(resolveVercelPreviewUrl('nuxt-app-api')).toBeUndefined()

    setEnv({ VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'nuxt-app-api.vercel.app' })
    expect(resolveVercelPreviewUrl('nuxt-app-app')).toBeUndefined()
  })

  it('strips a protocol if one is present', () => {
    setEnv({
      VERCEL_ENV: 'preview',
      VERCEL_BRANCH_URL: 'https://nuxt-app-api-git-feature-x-rujealfon.vercel.app',
    })

    expect(resolveVercelPreviewUrl('nuxt-app-app'))
      .toBe('https://nuxt-app-app-git-feature-x-rujealfon.vercel.app')
  })
})

describe('explicit env still wins over the derived preview URL', () => {
  it('is skipped when a dashboard/build URL is already set (same || chain as nuxt.config)', () => {
    setEnv({
      VERCEL_ENV: 'preview',
      VERCEL_BRANCH_URL: 'nuxt-app-app-git-feature-vercel-preview-rujealfon.vercel.app',
    })

    const fromDashboard = 'https://api.nuxt-app.com'
    expect(fromDashboard || resolveVercelPreviewUrl('nuxt-app-api')).toBe(fromDashboard)
    expect('' || resolveVercelPreviewUrl('nuxt-app-api'))
      .toBe('https://nuxt-app-api-git-feature-vercel-preview-rujealfon.vercel.app')
  })
})
