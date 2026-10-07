# Public site guide

Apply the [root guide](../../AGENTS.md). Paths below are relative to `apps/web`.

## Placement and rendering

This site extends the UI layer only. Shared components, theme styles, and
`useSite()` belong in `packages/ui`. The client layer's auth and API composables
require explicitly adding that layer.

Keep routes in `app/pages/`, app-wide composition in `app/app.vue`, and static
files in `public/`. For substantial page behavior, follow the root guide's
architecture and Feature-Sliced Design pointers.

Keep public pages compatible with build-time rendering. The home route is
prerendered and the build crawls links. Access browser APIs in client lifecycle
hooks. After adding routes or changing prerender configuration, run `pnpm build`
and verify every expected page under `apps/web/.output/public/`.

Use `useSite().linkTo(...)` for links between apps and
`navigateTo(url, { external: true })` for programmatic navigation to another app.
Set page metadata with `useHead()`. Import these composables from `#imports`.
Public runtime config contains browser-visible values only.

## Tests

Run `pnpm test --project web`. Follow `test/index.spec.ts` for
`mountSuspended`, `mockNuxtImport`, visible content, and navigation checks.
When shared UI changes, also run `pnpm test --project ui`.
