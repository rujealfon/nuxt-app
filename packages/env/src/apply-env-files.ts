import { existsSync } from 'node:fs'
import { config } from 'dotenv'

/** Existing process.env wins. First file wins. Missing files are ignored. */
export function applyEnvFiles(files: string[]) {
  for (const file of files) {
    if (existsSync(file))
      config({ path: file })
  }
}
