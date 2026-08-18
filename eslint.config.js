import antfu from '@antfu/eslint-config'
import { featureBoundariesPlugin } from './eslint/feature-boundaries.js'

function appImports(files, alias, ignores = []) {
  return {
    files,
    ignores,
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['./*', '../*'],
            message: `Use ${alias}/ instead of relative imports.`,
          },
          {
            group: ['@/*', '~/*'],
            message: `Use ${alias}/ instead of @/ or ~/.`,
          },
        ],
      }],
    },
  }
}

function featureIsolation(srcDir, alias) {
  return [
    {
      files: [`${srcDir}/features/**/*.{ts,vue}`],
      plugins: {
        features: featureBoundariesPlugin,
      },
      rules: {
        'features/no-cross-feature-import': ['error', { alias }],
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: ['@/*', '~/*'],
              message: `Use ${alias}/ or a relative path inside this feature.`,
            },
            {
              group: [`${alias}/pages/*`, `${alias}/pages/**`],
              message: 'Features do not import pages. Pages import features.',
            },
            {
              group: [`${alias}/layouts/*`, `${alias}/layouts/**`],
              message: 'Layouts stay in app/layouts. Features do not import them.',
            },
          ],
        }],
      },
    },
    {
      files: [`${srcDir}/components/**/*.{ts,vue}`],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: ['./*', '../*'],
              message: `Use ${alias}/ instead of relative imports.`,
            },
            {
              group: ['@/*', '~/*'],
              message: `Use ${alias}/ instead of @/ or ~/.`,
            },
            {
              group: [`${alias}/features/*`, `${alias}/features/**`],
              message: 'app/components is shared UI. Feature code stays in app/features/<name>.',
            },
          ],
        }],
      },
    },
  ]
}

const overrides = [
  appImports(['apps/api/**/*.ts'], '@api', ['apps/api/src/rpc.ts', 'apps/api/drizzle.config.ts']),
  appImports(['apps/app/**/*.{ts,vue}'], '@app'),
  appImports(['apps/admin/**/*.{ts,vue}'], '@admin'),
  appImports(['apps/web/**/*.{ts,vue}'], '@web'),
  ...featureIsolation('apps/app/app', '@app'),
  ...featureIsolation('apps/admin/app', '@admin'),
]

export default antfu({
  vue: true,
  typescript: true,
  formatters: true,
}, ...overrides)
