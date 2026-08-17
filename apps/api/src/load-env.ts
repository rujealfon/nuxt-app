import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyEnvFiles } from '@api/apply-env-files'

const srcDir = dirname(fileURLToPath(import.meta.url))
const apiRoot = resolve(srcDir, '..')
const repoRoot = resolve(apiRoot, '../..')

export { applyEnvFiles }

/** Root `.env`, then `apps/api/.env`. Existing process.env wins. */
export function loadEnv() {
  applyEnvFiles([resolve(repoRoot, '.env'), resolve(apiRoot, '.env')])
}
