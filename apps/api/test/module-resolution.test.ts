import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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

it('vercel bundle inlines workspace packages so /var/task does not need them', () => {
  execFileSync('bash', ['scripts/bundle-vercel.sh'], {
    cwd: apiRoot,
    stdio: 'pipe',
  })
  const js = readFileSync(join(apiRoot, 'dist/vercel/app.js'), 'utf8')
  expect(js).not.toMatch(/["']@nuxt-app\/types["']/)
  expect(js).not.toMatch(/["']@nuxt-app\/layer-base/)
  expect(js).toMatch(/(?:from|require|import)\s*(?:\(\s*)?["']hono["']/)
})
