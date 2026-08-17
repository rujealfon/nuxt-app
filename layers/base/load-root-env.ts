import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Root `.env`, then the workspace `.env`. Existing process.env wins. */
export function loadRootEnv() {
  // Vitest/Nuxt re-evaluate nuxt.config; skip so dotenv does not retrigger that loop.
  if (process.env.VITEST)
    return

  for (const file of [resolve(repoRoot, '.env'), resolve(process.cwd(), '.env')]) {
    if (existsSync(file))
      config({ path: file })
  }
}
