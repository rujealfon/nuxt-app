import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Load existing env files. Existing process.env wins. */
export function applyEnvFiles(files: string[]) {
  for (const file of files) {
    if (existsSync(file))
      config({ path: file })
  }
}

/** Root `.env`, then the workspace `.env`. */
export function loadRootEnv() {
  // Vitest/Nuxt re-evaluate nuxt.config; skip so dotenv does not retrigger that loop.
  if (process.env.VITEST)
    return

  applyEnvFiles([resolve(repoRoot, '.env'), resolve(process.cwd(), '.env')])
}
