import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const srcDir = dirname(fileURLToPath(import.meta.url))
const apiRoot = resolve(srcDir, '..')
const repoRoot = resolve(apiRoot, '../..')

/** Root `.env`, then `apps/api/.env`. Existing process.env wins. */
export function loadEnv() {
  config({ path: resolve(repoRoot, '.env') })
  config({ path: resolve(apiRoot, '.env') })
}
