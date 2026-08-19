#!/usr/bin/env bash
# Emit a single ESM file. Vercel's Hono tracer does not put pnpm packages in
# /var/task (workspace or npm), so the function cannot `import "hono"`.
set -euo pipefail

cd "$(dirname "$0")/.."
node scripts/bundle-vercel.mjs
