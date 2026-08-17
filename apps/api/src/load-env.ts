import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const srcDir = dirname(fileURLToPath(import.meta.url))
const apiRoot = resolve(srcDir, '..')
const repoRoot = resolve(apiRoot, '../..')

function applyEnvFiles(files: string[]) {
  for (const file of files) {
    if (existsSync(file))
      config({ path: file })
  }
}

/** Root `.env`, then `apps/api/.env`. Existing process.env wins. */
export function loadEnv() {
  applyEnvFiles([resolve(repoRoot, '.env'), resolve(apiRoot, '.env')])
}
