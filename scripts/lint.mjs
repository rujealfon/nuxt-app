// Runs ESLint once per workspace group.
//
// Type-aware linting (`ts/no-deprecated`) makes TypeScript load a Nuxt-generated
// project per app. Each project binds ~2,000 declaration files and costs roughly
// 0.5 GB of heap, so linting every workspace in a single process peaks near
// 3.7 GB and overruns Node's default ~2 GB heap on CI.
//
// Splitting the work into separate processes keeps each heap to a single
// project, well under the default limit. The final group covers root-level and
// misc files, which load no type-aware project.
import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const eslintBin = fileURLToPath(new URL('../node_modules/eslint/bin/eslint.js', import.meta.url))
const forwarded = process.argv.slice(2)

const apps = readdirSync(new URL('../apps/', import.meta.url), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)

const groups = [
  // One process per app so each Nuxt project gets its own heap.
  ...apps.map(app => [`apps/${app}`]),
  // `packages/{config,types,logger}` and root `test/` share tsconfig.test.json.
  ['packages', 'test'],
  // Everything else (root configs, docs, scripts, .github, .vscode).
  ['.', '--ignore-pattern', 'apps/**', '--ignore-pattern', 'packages/**', '--ignore-pattern', 'test/**'],
]

const concurrency = Math.max(1, Math.min(4, availableParallelism(), groups.length))
let nextGroup = 0
let failed = false

function runGroup(paths) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [eslintBin, ...forwarded, ...paths],
      { stdio: ['ignore', 'inherit', 'inherit'] },
    )
    child.on('error', (error) => {
      console.error(error)
      failed = true
      resolve()
    })
    child.on('exit', (code, signal) => {
      if (signal || code !== 0)
        failed = true
      resolve()
    })
  })
}

async function worker() {
  while (nextGroup < groups.length)
    await runGroup(groups[nextGroup++])
}

await Promise.all(Array.from({ length: concurrency }, worker))

if (failed)
  process.exitCode = 1
