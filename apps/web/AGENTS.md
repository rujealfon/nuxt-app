# Repository guidelines

## Scope and structure

This public site extends `@nuxt-app/ui`. Shared components, theme styles, and
`useSite()` belong in `packages/ui`.

Put routes in `app/pages/`, app-wide composition in `app/app.vue`, and static
files in `public/`. Keep page-specific content here. Move reusable components
and styles into the shared UI layer.

## Rendering and navigation

The home route is prerendered, and Nitro crawls links during the build. Keep
public pages compatible with build-time rendering. Access browser-only APIs in
client lifecycle hooks. Check prerendering when adding routes.

Use `useSite().linkTo(...)` for links between apps. For programmatic navigation
to another app, use `navigateTo(url, { external: true })`. Set page metadata
with `useHead()` and use shared Nuxt UI components and theme tokens.

## Testing and configuration

Run `pnpm test --project web` for this app. Place `*.spec.ts` tests in `test/`
or beside code under `app/`. Follow
`test/index.spec.ts` to mount pages with `mountSuspended`, mock Nuxt imports
with `mockNuxtImport`, and check visible content and navigation. Run the `ui`
test project when changing shared components or styles.

Public runtime configuration is visible in the browser, so use it only for
public values.
Include screenshots in PRs that change the marketing page layout.
