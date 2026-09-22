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
    // Coverage is collected process-wide, so it is configured here (on the root
    // config) rather than inside the individual projects. Run `pnpm test:coverage`.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'apps/*/app/**/*.{ts,vue}',
        'apps/*/server/**/*.ts',
        'packages/*/app/**/*.{ts,vue}',
        'packages/*/server/**/*.ts',
        'packages/*/src/**/*.{ts,vue}',
        'packages/config/index.ts',
        'packages/logger/index.ts',
      ],
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.d.ts',
        '**/.nuxt/**',
        '**/.output/**',
        '**/node_modules/**',
      ],
      // Baseline for `test:coverage:ci` is ~80.5% on all four metrics; the floor
      // is kept a little lower so small additions don't red the build. Raise it
      // (or use `thresholds.autoUpdate`) as coverage improves.
      thresholds: {
        lines: 79,
        functions: 79,
        branches: 79,
        statements: 79,
      },
    },
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
