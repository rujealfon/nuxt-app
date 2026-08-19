#!/usr/bin/env bash
# Vercel API build: migrate, then emit the single-file Hono entry.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ "${SKIP_MIGRATE:-}" != 1 ]; then
  pnpm db:migrate
fi

node scripts/bundle-vercel.mjs
