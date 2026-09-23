import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  fsd.plugin,
  {
    files: ['apps/*/app/features/**'],
    rules: {
      'fsd/public-api': 'error',
      'fsd/no-layer-public-api': 'error',
      'fsd/no-segments-on-sliced-layers': 'error',
    },
  },
])
