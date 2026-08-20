# Web (`apps/web`)

Marketing site. Nuxt 4 SSG (`nuxt generate`, `nitro.preset: 'static'`). Extends `layer-base` only. Repo-root `AGENTS.md` covers monorepo commands, shared imports, and root `.env`. This file is this app only.

## Commands

```bash
pnpm dev:web                         # http://localhost:3003
pnpm --filter @nuxt-app/web test     # @nuxt/test-utils + Vitest, files under test/
pnpm --filter @nuxt-app/web test -- -t "links login and register to the product app origin"   # single test by name
pnpm --filter @nuxt-app/web type-check
pnpm --filter @nuxt-app/web build    # nuxt generate
```

## Pages

This app has no `features/` folder and no auth layer. Keep routes in `app/pages/`. Prefer prerender (`routeRules` already prerender `/**`). Do not add a Node server unless a page needs per-request data.

Use Nuxt `useFetch` / `useAsyncData` for page-local or generate-time data. Pinia Colada lives in `layers/auth` and is not loaded here.

Login/register CTAs bake `NUXT_PUBLIC_APP_URL` (falls back to `APP_URL`) at generate time.

## Imports

Same-app source: `@web/`. Layers: `extends: '@nuxt-app/layer-base'`. A specific layer file is `#layers/base`.
