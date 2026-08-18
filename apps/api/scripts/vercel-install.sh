#!/usr/bin/env bash
# Vercel Root Directory is apps/api. The pnpm lockfile and workspace live at the
# repo root. Walk up (and check Vercel checkout paths) so we do not install in
# the wrong directory — `--dir ../..` can miss and report "Already up-to-date"
# with no node_modules here.
set -euo pipefail

echo "vercel-install: cwd=$(pwd)"

is_workspace_root() {
  [ -f "$1/pnpm-lock.yaml" ] && [ -f "$1/pnpm-workspace.yaml" ]
}

find_workspace_root() {
  local dir cand
  dir=$(pwd)
  while [ "$dir" != / ]; do
    if is_workspace_root "$dir"; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done

  for cand in /vercel/path0 /vercel/path1 "$PWD/.." "$PWD/../.."; do
    if is_workspace_root "$cand"; then
      echo "$cand"
      return 0
    fi
  done

  return 1
}

root=$(find_workspace_root) || {
  echo "vercel-install: no pnpm-lock.yaml + pnpm-workspace.yaml found." >&2
  echo "Enable \"Include files outside the Root Directory\" on nuxt-app-api." >&2
  echo "cwd=$(pwd)" >&2
  ls -la . .. ../.. /vercel 2>/dev/null || true
  exit 1
}

echo "vercel-install: workspace root=$root"

# A custom `pnpm install` on Vercel uses the oldest pnpm in the image (6.35.1
# at /pnpm6). That ignores this lockfile. Corepack shims also lose to /pnpm6
# (`corepack pnpm` reported 0.34.5). npx fetches packageManager exactly.
# Official alternative: ENABLE_EXPERIMENTAL_COREPACK=1 and no custom install.
# https://vercel.com/docs/package-managers
# https://vercel.com/docs/builds/configure-a-build#corepack
pm=$(node -p "require('$root/package.json').packageManager")
echo "vercel-install: PATH pnpm=$(command -v pnpm || echo none) $(pnpm --version 2>/dev/null || echo none)"
echo "vercel-install: npx $pm"
pnpm_ver=$(npx --yes "$pm" --version)
echo "vercel-install: $pnpm_ver via npx $pm"
if [ "${pnpm_ver%%.*}" -lt 9 ]; then
  echo "vercel-install: expected $pm, got $pnpm_ver" >&2
  exit 1
fi

npx --yes "$pm" --dir "$root" install --frozen-lockfile

if [ ! -d node_modules ] && [ -d "$root/apps/api/node_modules" ]; then
  echo "vercel-install: linking $root/apps/api/node_modules -> $(pwd)/node_modules"
  ln -sfn "$root/apps/api/node_modules" node_modules
fi

if [ ! -d node_modules ]; then
  echo "vercel-install: node_modules still missing in $(pwd) after install." >&2
  exit 1
fi
