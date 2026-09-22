import antfu from '@antfu/eslint-config'
import vuejsAccessibility from 'eslint-plugin-vuejs-accessibility'
import { architecture, workspaceResolvers } from './eslint.architecture.mjs'

export default antfu({
  type: 'app',
  vue: true,
  typescript: true,
  ignores: [
    '**/pnpm-lock.yaml',
  ],
  formatters: {
    css: 'prettier',
    prettierOptions: {
      plugins: ['prettier-plugin-css-order'],
      cssDeclarationSorterKeepOverrides: false,
      cssDeclarationSorterOrder: 'alphabetical',
    },
  },
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
}, {
  // Wire the flat/recommended rules to Vue files only, so the plugin's
  // global parser/globals don't override @antfu's per-file setup.
  name: 'nuxt-app/vuejs-accessibility',
  files: ['**/*.vue'],
  plugins: {
    'vuejs-accessibility': vuejsAccessibility,
  },
  rules: vuejsAccessibility.configs['flat/recommended'][1].rules,
}, {
  name: 'nuxt-app/deprecated-apis',
  files: ['apps/*/{app,server,shared,test}/**/*.ts'],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    'ts/no-deprecated': 'error',
  },
}, {
  name: 'nuxt-app/shared-deprecated-apis',
  files: ['packages/{config,types,logger}/**/*.ts', 'test/**/*.ts'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.test.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    'ts/no-deprecated': 'error',
  },
}, architecture, ...workspaceResolvers)
