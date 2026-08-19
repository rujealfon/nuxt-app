import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Do not alias workspace packages to `../../packages/...`. On Vercel the API
// root is /vercel/path1, so `../..` is `/` and those files are not there.
// The checkout is /vercel/path0; install already linked node_modules here.
// Hono's detector only looks for a literal `import "hono"` / `from "hono"`.
// Keep it in a comment so Node does not try to resolve the package at runtime.
// createRequire lets bundled CJS (dotenv) call require("fs").
const banner = [
  '// import "hono"',
  'import { createRequire } from "node:module";',
  'const require = createRequire(import.meta.url);',
].join('\n')

await build({
  absWorkingDir: apiRoot,
  entryPoints: ['src/app.ts'],
  outfile: 'dist/vercel/app.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  banner: { js: banner },
  logLevel: 'info',
})
