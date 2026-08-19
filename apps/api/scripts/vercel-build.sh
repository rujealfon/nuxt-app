#!/usr/bin/env bash
# Vercel API build: migrate, then emit the Hono entry the builder will serve.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ "${SKIP_MIGRATE:-}" != 1 ]; then
  pnpm db:migrate
fi

bash scripts/bundle-vercel.sh
