import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function resolveFromApi(specifier: string) {
  return execFileSync(process.execPath, [
    '--input-type=module',
    '-e',
    `console.log(import.meta.resolve(${JSON.stringify(specifier)}))`,
  ], {
    cwd: apiRoot,
    encoding: 'utf8',
  }).trim()
}

it('plain Node resolves #api specifiers without a bundler', () => {
  expect(resolveFromApi('#api/env.js')).toMatch(/\/src\/env\.js$/)
})

it('plain Node cannot resolve TypeScript-only @api/ paths', () => {
  expect(() => resolveFromApi('@api/env.js')).toThrow(/Cannot find package '@api\/env\.js'/)
})
