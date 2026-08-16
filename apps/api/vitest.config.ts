import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@api': resolve(root, 'src'),
    },
  },
  test: {
    environment: 'node',
    fileParallelism: false,
  },
})
