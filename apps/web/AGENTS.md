# Public site guide

Read the [root guide](../../AGENTS.md) for workspace setup and verification.

## Scope and structure

This public site extends `@nuxt-app/ui`. Shared components, theme styles, and
`useSite()` belong in `packages/ui`.

Put routes in `app/pages/`, app-wide composition in `app/app.vue`, and static
files in `public/`. Keep page-specific content here and substantial screen
behavior in `app/features/<feature>/`, imported through its `index.ts`.
Move components and styles shared by multiple apps into the shared UI layer.
The site extends only the UI layer; auth and API composables from the client
layer are not available without explicitly adding that layer.

## Rendering and navigation

The home route is prerendered, and Nitro crawls links during the build. Keep
public pages compatible with build-time rendering. Access browser-only APIs in
client lifecycle hooks. Run `pnpm build` when adding routes or changing
prerender configuration, and verify the expected pages in `.output/public/`.

Use `useSite().linkTo(...)` for links between apps. For programmatic navigation
to another app, use `navigateTo(url, { external: true })`. Set page metadata
with `useHead()` and use shared Nuxt UI components and theme tokens.
Import `useSite`, `navigateTo`, and `useHead` explicitly from `#imports`.

## Testing and configuration

Run `pnpm test --project web` for this app. Place `*.spec.ts` tests in `test/`
or beside code under `app/`. Follow
`test/index.spec.ts` to mount pages with `mountSuspended`, mock Nuxt imports
with `mockNuxtImport`, and check visible content and navigation. Run the `ui`
test project when changing shared components or styles.

Public runtime configuration is visible in the browser, so use it only for
public values. The `.env.example` points at production sites; set the
`NUXT_PUBLIC_WEB_URL`, `NUXT_PUBLIC_APP_URL`, and `NUXT_PUBLIC_ADMIN_URL` origins
to local ports before testing cross-app navigation locally.
Include screenshots in PRs that change the marketing page layout.
