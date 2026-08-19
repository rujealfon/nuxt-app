import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
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

it('workspace packages resolve from apps/api node_modules', () => {
  expect(resolveFromApi('@nuxt-app/types')).toMatch(/packages\/types\/src\/index\.ts$/)
})

it('vercel bundle boots in an empty /var/task without node_modules', () => {
  execFileSync(process.execPath, ['scripts/bundle-vercel.mjs'], {
    cwd: apiRoot,
    stdio: 'pipe',
  })
  const bundle = join(apiRoot, 'dist/vercel/app.js')
  const js = readFileSync(bundle, 'utf8')
  expect(js).toMatch(/(?:from|require|import)\s*(?:\(\s*)?["']hono["']/)

  const dir = mkdtempSync(join(tmpdir(), 'api-vercel-task-'))
  copyFileSync(bundle, join(dir, 'app.js'))
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}\n')

  const output = execFileSync(process.execPath, ['app.js'], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      DATABASE_URL: 'postgres://u:p@127.0.0.1:9/db',
    },
  })
  expect(output).not.toMatch(/Cannot find package/)
})
