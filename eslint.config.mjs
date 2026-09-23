import antfu from '@antfu/eslint-config'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
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
  // Nuxt layer packages generate their own tsconfig via `nuxt prepare`.
  name: 'nuxt-app/layer-deprecated-apis',
  files: ['packages/{client,ui}/{app,test,shared}/**/*.ts'],
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
}, {
  // Tailwind class formatting and correctness. `entryPoint` is the single
  // Tailwind v4 stylesheet the whole monorepo shares. `cwd` lets the plugin
  // resolve `tailwindcss` from the UI package under pnpm's strict
  // node_modules; `entryPoint` is relative to it. Nuxt UI's virtual
  // `#build/ui.css` import resolves through the package's Node `imports`
  // fallback, so the semantic theme tokens are read without a generated
  // `.nuxt` tsconfig.
  name: 'nuxt-app/better-tailwindcss',
  files: ['**/*.{vue,ts}'],
  ...betterTailwindcss.configs.recommended,
  rules: {
    ...betterTailwindcss.configs.recommended.rules,
    // The default 80 wraps short class lists into multi-line `class=""`
    // blocks, which reads poorly in Vue templates. 100 matches the line
    // length the rest of the codebase already uses.
    'better-tailwindcss/enforce-consistent-line-wrapping': ['warn', { printWidth: 100 }],
  },
  settings: {
    'better-tailwindcss': {
      cwd: 'packages/ui',
      entryPoint: 'app/assets/css/main.css',
    },
  },
}, architecture, ...workspaceResolvers)
