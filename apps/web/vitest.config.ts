import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    dir: './test',
    testTimeout: 15_000,
  },
})
