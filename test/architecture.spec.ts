import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// These snippets use virtual paths and only exercise import boundaries.
const eslint = new ESLint({
  overrideConfig: {
    languageOptions: { parserOptions: { project: false, projectService: false } },
    rules: { 'ts/no-deprecated': 'off' },
  },
})

async function violations(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath })
  expect(result.fatalErrorCount).toBe(0)
  expect(result.messages.some(message => message.message.startsWith('Resolve error:'))).toBe(false)
  return result.messages.filter(
    message => message.ruleId?.startsWith('boundaries/')
      || message.ruleId === 'no-restricted-syntax',
  )
}

// Boundaries resolve real files, so nested service layouts need a throwaway fixture.
const fixture = fileURLToPath(new URL('../apps/api/server/services/arch-fixture/', import.meta.url))

describe('architecture import rules', () => {
  // Resolving the ESLint config and loading its plugins is a one-time cost that
  // otherwise lands on the first lint. Coverage instrumentation can push that
  // past the 5s test default and fail the run, so pay it here with headroom.
  beforeAll(async () => {
    mkdirSync(`${fixture}commands`, { recursive: true })
    writeFileSync(`${fixture}index.ts`, 'export {}\n')
    writeFileSync(`${fixture}commands/y.ts`, 'export const y = 1\n')
    writeFileSync(`${fixture}commands/z.ts`, 'export const z = 1\n')
    mkdirSync(`${fixture}domain`, { recursive: true })
    writeFileSync(`${fixture}domain/z.ts`, 'export const z = 1\n')
    await eslint.lintText('<script setup lang="ts"></script>', {
      filePath: 'apps/app/app/pages/login.vue',
    })
  }, 30_000)

  afterAll(() => rmSync(fixture, { recursive: true, force: true }))

  it.each([
    [
      'apps/app/app/pages/login.vue',
      '<script setup lang="ts">import { LoginScreen } from \'~/features/auth\'</script>',
    ],
    [
      'apps/admin/app/pages/login.vue',
      '<script setup lang="ts">import { AdminLoginScreen } from \'@/features/auth\'</script>',
    ],
    [
      'apps/app/app/features/auth/index.ts',
      'export { default as LoginScreen } from \'./ui/LoginScreen.vue\'',
    ],
    [
      'apps/app/app/features/auth/model/form.ts',
      'import LoginScreen from \'../ui/LoginScreen.vue\'',
    ],
    ['apps/app/app/workflows/login.ts', 'import { LoginScreen } from \'../features/auth\''],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { getHelloMessage } from \'#server/services/hello\'',
    ],
    [
      'apps/api/server/services/hello/index.ts',
      'export { getHelloMessage } from \'./get-hello-message\'',
    ],
    [
      'apps/api/server/services/hello/hello.spec.ts',
      'import { getHelloMessage } from \'./get-hello-message\'',
    ],
    [
      'apps/api/server/workflows/greeting.ts',
      'import { getHelloMessage } from \'#server/services/hello\'',
    ],
    [
      'apps/api/server/services/arch-fixture/commands/y.ts',
      'import { z } from \'./z\'',
    ],
    [
      'apps/api/server/services/arch-fixture/index.ts',
      'export { y } from \'./commands/y\'',
    ],
    // Across subfolders of the same service, the `#server` alias is the way.
    [
      'apps/api/server/services/arch-fixture/commands/y.ts',
      'import { z } from \'#server/services/arch-fixture/domain/z\'',
    ],
    [
      'apps/api/server/services/arch-fixture/commands/y.ts',
      'import { z } from \'#server/services/arch-fixture/commands/z\'',
    ],
    [
      'apps/api/server/services/x/commands/y.ts',
      'import type { Database } from \'#server/utils/db-core\'',
    ],
    [
      'apps/api/server/api/health/ready.get.ts',
      'import { useDb } from \'#server/utils/db\'',
    ],
    [
      'apps/api/server/workflows/greeting.ts',
      'import { withTransaction } from \'#server/utils/db\'',
    ],
    ['apps/app/app/features/auth/model/form.ts', 'import { loginSchema } from \'@nuxt-app/types\''],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { defineVersionedHandler } from \'#server/utils/versioned\'',
    ],
    [
      'apps/api/server/api/auth/[...all].ts',
      'import { defineResultHandler } from \'#server/utils/result-handler\'',
    ],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { getQuery, setHeader } from \'h3\'',
    ],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import type { eventHandler } from \'h3\'',
    ],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { type defineEventHandler } from \'h3\'',
    ],
    // The `EventHandler` type is not a handler factory, with or without `type`.
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import type { EventHandler } from \'h3\'',
    ],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { type EventHandler } from \'h3\'',
    ],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import type { defineEventHandler } from \'#imports\'',
    ],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { type defineCachedEventHandler, useRuntimeConfig } from \'#imports\'',
    ],
    [
      'apps/api/server/services/x/commands/y.ts',
      'import type { useRuntimeConfig } from \'#imports\'',
    ],
    [
      'apps/api/server/services/x/commands/y.ts',
      'import type { Database } from \'#server/utils/db-core.ts\'',
    ],
    // Documented infrastructure routes keep a plain event handler (ADR 0005).
    ['apps/api/server/api/health.get.ts', 'import { defineEventHandler } from \'h3\''],
    ['apps/api/server/api/health/ready.get.ts', 'import { defineEventHandler } from \'h3\''],
    ['apps/api/server/api/index.get.ts', 'import { defineEventHandler } from \'h3\''],
    ['apps/api/server/api/openapi.json.get.ts', 'import { defineEventHandler } from \'h3\''],
    ['apps/api/server/api/docs.get.ts', 'import { defineEventHandler } from \'h3\''],
    [
      'apps/api/server/api/docs-assets/standalone.js.get.ts',
      'import { defineEventHandler } from \'h3\'',
    ],
    ['apps/api/server/api/[...slug].ts', 'import { defineEventHandler } from \'h3\''],
    // Specs and code outside the route folder are not route handlers.
    [
      'apps/api/server/api/v1/hello.get.spec.ts',
      'import { defineEventHandler } from \'h3\'',
    ],
    ['apps/api/server/utils/result-handler.ts', 'import { defineEventHandler } from \'h3\''],
    ['apps/api/server/middleware/docs-guard.ts', 'import { defineEventHandler } from \'h3\''],
    ['apps/api/server/workflows/greeting.ts', 'import { eventHandler } from \'h3\''],
    [
      'apps/api/server/services/x/commands/y.ts',
      'import { type Database } from \'#server/utils/db-core\'',
    ],
    [
      'apps/api/server/services/x/commands/y.ts',
      'import { type Database, type createDb } from \'#server/utils/db-core\'',
    ],
    [
      'apps/api/server/services/x/commands/y.ts',
      'import type { Database, createDb } from \'#server/utils/db-core\'',
    ],
    [
      'apps/api/server/services/x/commands/y.ts',
      'export type { Database } from \'#server/utils/db-core\'',
    ],
    [
      'apps/api/server/services/x/commands/y.ts',
      'import type { Pool } from \'pg\'',
    ],
    [
      'apps/api/server/services/x/commands/y.ts',
      'import type { useRuntimeConfig } from \'nitropack/runtime\'',
    ],
    [
      'apps/api/server/workflows/greeting.ts',
      'import { useRuntimeConfig } from \'nitropack/runtime\'',
    ],
    [
      'apps/api/server/api/auth/[...all].ts',
      'import { useRuntimeConfig } from \'nitropack/runtime\'',
    ],
    [
      'apps/api/server/utils/db.ts',
      'import { createDb } from \'#server/utils/db-core\'',
    ],
    ['apps/api/server/utils/db.ts', 'import { Pool } from \'pg\''],
    [
      'apps/api/server/api/health/ready.get.ts',
      'import { drizzle } from \'drizzle-orm/node-postgres\'',
    ],
  ])('allows a supported dependency from %s', async (filePath, code) => {
    expect(await violations(filePath, code)).toEqual([])
  })

  it.each([
    [
      'apps/app/app/pages/login.vue',
      '<script setup lang="ts">import Screen from \'~/features/auth/ui/LoginScreen.vue\'</script>',
    ],
    [
      'apps/admin/app/pages/login.vue',
      '<script setup lang="ts">import Screen from '
      + '\'@/features/auth/ui/AdminLoginScreen.vue\'</script>',
    ],
    [
      'apps/app/app/pages/login.vue',
      '<script setup lang="ts">import Screen from \'../features/auth/ui/LoginScreen.vue\'</script>',
    ],
    [
      'apps/app/app/pages/login.vue',
      '<script setup lang="ts">const screen = '
      + 'import(\'~/features/auth/ui/LoginScreen.vue\')</script>',
    ],
    [
      'apps/app/app/workflows/login.ts',
      'import LoginScreen from \'../features/auth/ui/LoginScreen.vue\'',
    ],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { y } from \'#server/services/arch-fixture/commands/y\'',
    ],
    [
      'apps/api/server/services/x/commands/y.ts',
      'import { useDb } from \'#server/utils/db\'',
    ],
    [
      'apps/api/server/services/x/queries/get-z.ts',
      'import { withTransaction } from \'#server/utils/db\'',
    ],
    [
      'apps/api/server/services/x/y.ts',
      'const load = () => import(\'#server/utils/db\')',
    ],
    [
      'apps/api/server/services/x/y.ts',
      'export { useDb } from \'#server/utils/db\'',
    ],
    [
      'apps/api/server/services/x/commands/y.ts',
      'import { useRuntimeConfig } from \'nitropack/runtime\'',
    ],
    ['apps/api/server/services/x/y.ts', 'export { useRuntimeConfig } from \'nitropack/runtime\''],
    ['apps/api/server/services/x/y.ts', 'export * from \'nitropack/runtime\''],
    ['apps/api/server/services/x/y.ts', 'const load = () => import(\'nitropack/runtime\')'],
    ['apps/api/server/services/x/y.ts', 'import { useRuntimeConfig } from \'#imports\''],
    ['apps/api/server/services/x/y.ts', 'export * from \'#imports\''],
    ['apps/api/server/services/x/y.ts', 'const load = () => import(\'#imports\')'],
    ['apps/api/server/services/x/y.ts', 'import { useDb } from \'#server/utils/db.ts\''],
    ['apps/api/server/services/x/y.ts', 'import { createDb } from \'#server/utils/db-core.ts\''],
    ['apps/api/server/services/x/y.ts', 'import { Pool } from \'pg\''],
    ['apps/api/server/services/x/y.ts', 'import pg from \'pg\''],
    ['apps/api/server/services/x/y.ts', 'export { Pool } from \'pg\''],
    ['apps/api/server/services/x/y.ts', 'const load = () => import(\'pg\')'],
    ['apps/api/server/services/x/y.ts', 'import { drizzle } from \'drizzle-orm/node-postgres\''],
    ['apps/api/server/services/x/y.ts', 'export * from \'drizzle-orm/node-postgres\''],
    [
      'apps/api/server/services/x/y.ts',
      'const load = () => import(\'drizzle-orm/node-postgres\')',
    ],
    ['apps/api/server/services/x/y.ts', 'import { createDb } from \'#server/utils/db-core\''],
    [
      'apps/api/server/services/x/y.ts',
      'import { type Database, createDb } from \'#server/utils/db-core\'',
    ],
    [
      'apps/api/server/services/x/y.ts',
      'import { createDb as make } from \'#server/utils/db-core\'',
    ],
    ['apps/api/server/services/x/y.ts', 'import * as core from \'#server/utils/db-core\''],
    ['apps/api/server/services/x/y.ts', 'export { createDb } from \'#server/utils/db-core\''],
    ['apps/api/server/services/x/y.ts', 'export * from \'#server/utils/db-core\''],
    ['apps/api/server/services/x/y.ts', 'const load = () => import(\'#server/utils/db-core\')'],
    [
      'apps/api/server/services/auth/handle-auth-request.ts',
      'import { useRuntimeConfig } from \'nitropack/runtime\'',
    ],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { defineEventHandler } from \'h3\'',
    ],
    ['apps/api/server/api/v1/hello.get.ts', 'import { eventHandler } from \'h3\''],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { defineEventHandler as handler } from \'h3\'',
    ],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { defineLazyEventHandler } from \'h3\'',
    ],
    ['apps/api/server/api/v1/hello.get.ts', 'import { lazyEventHandler } from \'h3\''],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { defineCachedEventHandler } from \'nitropack/runtime\'',
    ],
    ['apps/api/server/api/v1/hello.get.ts', 'import { defineEventHandler } from \'#imports\''],
    ['apps/api/server/api/v1/hello.get.ts', 'import { eventHandler } from \'#imports\''],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { type EventHandler, defineEventHandler } from \'h3\'',
    ],
    ['apps/api/server/api/v1/hello.get.ts', 'import * as imports from \'#imports\''],
    ['apps/api/server/api/v1/hello.get.ts', 'export { defineEventHandler } from \'#imports\''],
    ['apps/api/server/api/v1/hello.get.ts', 'export * from \'#imports\''],
    ['apps/api/server/api/v1/hello.get.ts', 'const load = () => import(\'#imports\')'],
    ['apps/api/server/api/v1/hello.get.ts', 'import * as h3 from \'h3\''],
    ['apps/api/server/api/v1/hello.get.ts', 'export { defineEventHandler } from \'h3\''],
    ['apps/api/server/api/v1/hello.get.ts', 'export * from \'h3\''],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'const load = () => import(\'h3\')',
    ],
    ['apps/api/server/api/auth/[...all].ts', 'import { defineEventHandler } from \'h3\''],
    ['apps/api/server/api/new-route.get.ts', 'import { defineEventHandler } from \'h3\''],
    ['apps/api/server/api/health/live.get.ts', 'import { defineEventHandler } from \'h3\''],
    ['apps/api/server/api/docs/page.get.ts', 'import { defineEventHandler } from \'h3\''],
    // The exemption keeps the parent-relative alias guard.
    [
      'apps/api/server/api/health.get.ts',
      'import { healthResponseSchema } from \'../utils/infra\'',
    ],
    [
      'apps/api/server/services/auth/handle-auth-request.ts',
      'import { Pool } from \'pg\'',
    ],
    [
      'apps/api/server/services/auth/handle-auth-request.ts',
      'import { useDb } from \'#server/utils/db\'',
    ],
    [
      'apps/api/server/services/auth/read-auth-body.ts',
      'import { useRuntimeConfig } from \'nitropack/runtime\'',
    ],
    ['apps/app/app/features/billing/index.ts', 'export { LoginScreen } from \'../auth\''],
    ['apps/app/app/features/auth/model/form.ts', 'import Page from \'../../../pages/login.vue\''],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { getHelloMessage } from \'../../services/hello/get-hello-message\'',
    ],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { getHelloMessage } from \'#server/services/hello/get-hello-message\'',
    ],
    [
      'apps/api/server/api/v1/hello.get.ts',
      'import { getHelloMessage } from \'../../services/hello\'',
    ],
    [
      'apps/api/server/services/auth/handle-auth-request.ts',
      'const load = () => import(\'../../utils/auth\')',
    ],
    [
      'apps/api/server/services/auth/auth-error-contract.ts',
      'export { domainFailure } from \'../../utils/domain-failure\'',
    ],
    [
      'apps/api/server/services/auth/auth-error-contract.ts',
      'export * from \'../../utils/domain-failure\'',
    ],
    [
      'apps/api/server/workflows/greeting.ts',
      'import { getHelloMessage } from \'../services/hello/get-hello-message\'',
    ],
    ['apps/api/server/services/orders/index.ts', 'import { getHelloMessage } from \'../hello\''],
    [
      'apps/api/server/services/hello/get-hello-message.ts',
      'import handler from \'../../api/v1/hello.get\'',
    ],
    [
      'apps/admin/app/pages/login.vue',
      '<script setup lang="ts">import { LoginScreen } from '
      + '\'../../../app/app/features/auth\'</script>',
    ],
    [
      'packages/types/src/index.ts',
      'import { LoginScreen } from \'../../../apps/app/app/features/auth\'',
    ],
    ['apps/api/app/example.ts', 'import { getHelloMessage } from \'~~/server/services/hello\''],
  ])('rejects an unsupported dependency from %s: %s', async (filePath, code) => {
    expect(await violations(filePath, code)).not.toHaveLength(0)
  })
})
