import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'app',
  vue: true,
  typescript: true,
  ignores: [
    '**/pnpm-lock.yaml',
  ],
}, {
  rules: {
    // Nuxt and Nitro expose these as Node globals.
    'node/prefer-global/buffer': 'off',
    'node/prefer-global/process': 'off',
    // Don't let linting mutate package-manager policy settings.
    'pnpm/yaml-enforce-settings': 'off',
  },
}, {
  files: ['**/seed.ts'],
  rules: {
    'no-console': 'off',
  },
})
