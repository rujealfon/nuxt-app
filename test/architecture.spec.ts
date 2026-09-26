import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

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
  return result.messages.filter(message => message.ruleId?.startsWith('boundaries/'))
}

describe('architecture import rules', () => {
  // Resolving the ESLint config and loading its plugins is a one-time cost that
  // otherwise lands on the first lint. Coverage instrumentation can push that
  // past the 5s test default and fail the run, so pay it here with headroom.
  beforeAll(async () => {
    await eslint.lintText('<script setup lang="ts"></script>', { filePath: 'apps/app/app/pages/login.vue' })
  }, 30_000)

  it.each([
    ['apps/app/app/pages/login.vue', '<script setup lang="ts">import { LoginScreen } from \'~/features/auth\'</script>'],
    ['apps/admin/app/pages/login.vue', '<script setup lang="ts">import { AdminLoginScreen } from \'@/features/auth\'</script>'],
    ['apps/app/app/features/auth/index.ts', 'export { default as LoginScreen } from \'./ui/LoginScreen.vue\''],
    ['apps/app/app/features/auth/model/form.ts', 'import LoginScreen from \'../ui/LoginScreen.vue\''],
    ['apps/app/app/workflows/login.ts', 'import { LoginScreen } from \'../features/auth\''],
    ['apps/api/server/api/v1/hello.get.ts', 'import { getHelloMessage } from \'../../services/hello\''],
    ['apps/api/server/services/hello/index.ts', 'export { getHelloMessage } from \'./get-hello-message\''],
    ['apps/api/server/services/hello/hello.spec.ts', 'import { getHelloMessage } from \'./get-hello-message\''],
    ['apps/api/server/workflows/greeting.ts', 'import { getHelloMessage } from \'../services/hello\''],
    ['apps/app/app/features/auth/model/form.ts', 'import { loginSchema } from \'@nuxt-app/types\''],
  ])('allows a supported dependency from %s', async (filePath, code) => {
    expect(await violations(filePath, code)).toEqual([])
  })

  it.each([
    ['apps/app/app/pages/login.vue', '<script setup lang="ts">import Screen from \'~/features/auth/ui/LoginScreen.vue\'</script>'],
    ['apps/admin/app/pages/login.vue', '<script setup lang="ts">import Screen from \'@/features/auth/ui/AdminLoginScreen.vue\'</script>'],
    ['apps/app/app/pages/login.vue', '<script setup lang="ts">import Screen from \'../features/auth/ui/LoginScreen.vue\'</script>'],
    ['apps/app/app/pages/login.vue', '<script setup lang="ts">const screen = import(\'~/features/auth/ui/LoginScreen.vue\')</script>'],
    ['apps/app/app/workflows/login.ts', 'import LoginScreen from \'../features/auth/ui/LoginScreen.vue\''],
    ['apps/app/app/features/billing/index.ts', 'export { LoginScreen } from \'../auth\''],
    ['apps/app/app/features/auth/model/form.ts', 'import Page from \'../../../pages/login.vue\''],
    ['apps/api/server/api/v1/hello.get.ts', 'import { getHelloMessage } from \'../../services/hello/get-hello-message\''],
    ['apps/api/server/api/v1/hello.get.ts', 'import { getHelloMessage } from \'#server/services/hello/get-hello-message\''],
    ['apps/api/server/workflows/greeting.ts', 'import { getHelloMessage } from \'../services/hello/get-hello-message\''],
    ['apps/api/server/services/orders/index.ts', 'import { getHelloMessage } from \'../hello\''],
    ['apps/api/server/services/hello/get-hello-message.ts', 'import handler from \'../../api/v1/hello.get\''],
    ['apps/admin/app/pages/login.vue', '<script setup lang="ts">import { LoginScreen } from \'../../../app/app/features/auth\'</script>'],
    ['packages/types/src/index.ts', 'import { LoginScreen } from \'../../../apps/app/app/features/auth\''],
    ['apps/api/app/example.ts', 'import { getHelloMessage } from \'~~/server/services/hello\''],
  ])('rejects an unsupported dependency from %s: %s', async (filePath, code) => {
    expect(await violations(filePath, code)).not.toHaveLength(0)
  })
})
