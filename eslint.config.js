import antfu from '@antfu/eslint-config'

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

const overrides = [
  appImports(['apps/api/**/*.ts'], '@api', ['apps/api/src/rpc.ts']),
  appImports(['apps/app/**/*.{ts,vue}'], '@app'),
  appImports(['apps/admin/**/*.{ts,vue}'], '@admin'),
  appImports(['apps/web/**/*.{ts,vue}'], '@web'),
]

export default antfu({
  vue: true,
  typescript: true,
  formatters: true,
}, ...overrides)
