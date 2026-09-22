import { fileURLToPath } from 'node:url'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

function dir(path: string) {
  return fileURLToPath(new URL(path, import.meta.url))
}

// Tests may be colocated next to source (`app/**`) or grouped under `test/**`.
function nuxtProject(name: string, root: string, appName: string) {
  return defineVitestProject({
    test: {
      name,
      environment: 'nuxt',
      include: [`${root}/app/**/*.spec.ts`, `${root}/test/**/*.spec.ts`],
      exclude: ['**/*.server.spec.ts', '**/node_modules/**'],
      environmentOptions: {
        nuxt: {
          rootDir: dir(root),
          overrides: {
            runtimeConfig: {
              public: {
                appName,
                apiBase: 'http://api.test',
                apiVersion: 'v1',
                webUrl: 'http://web.test',
                appUrl: 'http://app.test',
                adminUrl: 'http://admin.test',
              },
            },
          },
        },
      },
    },
  })
}

export default defineConfig({
  test: {
    projects: [
      {
        define: { 'import.meta.server': true },
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'test/**/*.spec.ts',
            'packages/{config,types,logger}/test/**/*.spec.ts',
            'apps/api/server/**/*.spec.ts',
            'packages/client/app/**/*.server.spec.ts',
          ],
        },
      },
      {
        test: {
          name: 'api',
          environment: 'node',
          include: ['apps/api/test/e2e/**/*.spec.ts'],
          hookTimeout: 180_000,
          testTimeout: 60_000,
          env: {
            DATABASE_URL: 'postgres://test:test@localhost:5432/test',
            REDIS_URL: 'redis://localhost:6379',
            BETTER_AUTH_URL: 'http://localhost:3003',
            BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
            RATE_LIMIT_ENABLED: 'false',
          },
        },
      },
      {
        test: {
          name: 'api-dev',
          environment: 'node',
          include: ['apps/api/test/e2e-dev/**/*.spec.ts'],
          hookTimeout: 180_000,
          testTimeout: 60_000,
          env: {
            DATABASE_URL: 'postgres://test:test@localhost:5432/test',
            REDIS_URL: 'redis://localhost:6379',
            BETTER_AUTH_URL: 'http://localhost:3003',
            BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
            RATE_LIMIT_ENABLED: 'false',
          },
        },
      },
      await nuxtProject('ui', 'packages/ui', 'web'),
      await nuxtProject('client', 'packages/client', 'app'),
      await nuxtProject('web', 'apps/web', 'web'),
      await nuxtProject('app', 'apps/app', 'app'),
      await nuxtProject('admin', 'apps/admin', 'admin'),
    ],
  },
})
