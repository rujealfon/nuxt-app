#!/usr/bin/env bash
# Hono on Vercel transpiles src/app.ts and traces node_modules from apps/api.
# pnpm workspace packages live outside that root, so /var/task has no
# @nuxt-app/types (or layer-base). Bundle those in; leave npm packages external.
set -euo pipefail

api_root=$(cd "$(dirname "$0")/.." && pwd)
repo_root=$(cd "$api_root/../.." && pwd)

cd "$api_root"

pnpm exec esbuild src/app.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --outfile=dist/vercel/app.js \
  --packages=external \
  --alias:@nuxt-app/types="$repo_root/packages/types/src/index.ts" \
  --alias:@nuxt-app/layer-base/apply-env-files="$repo_root/layers/base/apply-env-files.ts" \
  --banner:js='import "hono";'
