import antfu from '@antfu/eslint-config'

function appImports(files, alias) {
  return {
    files,
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
  appImports(['apps/api/**/*.ts'], '@api'),
  appImports(['apps/app/**/*.{ts,vue}'], '@app'),
  appImports(['apps/admin/**/*.{ts,vue}'], '@admin'),
  appImports(['apps/site/**/*.{ts,vue}'], '@site'),
]

export default antfu({
  vue: true,
  typescript: true,
  formatters: true,
}, ...overrides)
