import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Root `.env`, then the workspace `.env`. Existing process.env wins. */
export function loadRootEnv() {
  config({ path: resolve(repoRoot, '.env') })
  config({ path: resolve(process.cwd(), '.env') })
}
