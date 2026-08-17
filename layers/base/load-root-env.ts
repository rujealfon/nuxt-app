import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { applyEnvFiles } from '../../apps/api/src/apply-env-files'

export { applyEnvFiles }

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Root `.env`, then the workspace `.env`. */
export function loadRootEnv() {
  // Vitest/Nuxt re-evaluate nuxt.config; skip so dotenv does not retrigger that loop.
  if (process.env.VITEST)
    return

  applyEnvFiles([resolve(repoRoot, '.env'), resolve(process.cwd(), '.env')])
}
