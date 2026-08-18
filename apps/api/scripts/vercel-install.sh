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

# Vercel’s bundled pnpm is older than this repo (pnpm 11 / lockfile 9) and
# ignores the lockfile as incompatible, then --frozen-lockfile fails.
if ! command -v corepack >/dev/null; then
  echo "vercel-install: corepack is required to pin pnpm to packageManager." >&2
  exit 1
fi
pm=$(node -p "require('$root/package.json').packageManager")
echo "vercel-install: activating $pm (PATH pnpm=$(command -v pnpm || echo none) $(pnpm --version 2>/dev/null || echo none))"
corepack enable
corepack prepare "$pm" --activate
hash -r
# Vercel puts pnpm 6 on PATH ahead of Corepack shims. Invoke through corepack.
pnpm_cmd=(corepack pnpm)
echo "vercel-install: $($pnpm_cmd --version) via corepack pnpm"

pnpm_ver=$($pnpm_cmd --version)
if [ "${pnpm_ver%%.*}" -lt 9 ]; then
  echo "vercel-install: expected $pm, got $pnpm_ver" >&2
  exit 1
fi

$pnpm_cmd --dir "$root" install --frozen-lockfile

if [ ! -d node_modules ] && [ -d "$root/apps/api/node_modules" ]; then
  echo "vercel-install: linking $root/apps/api/node_modules -> $(pwd)/node_modules"
  ln -sfn "$root/apps/api/node_modules" node_modules
fi

if [ ! -d node_modules ]; then
  echo "vercel-install: node_modules still missing in $(pwd) after install." >&2
  exit 1
fi
