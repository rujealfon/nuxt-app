# Repository Guidelines

## Scope & Structure

Follow the shared conventions and contribution checks in [the root guide](../../AGENTS.md). This directory contains the public marketing site, served locally on port 3000. It extends `@nuxt-app/ui`; shared components, theme styles, and `useSite()` belong in `packages/ui`.

Put routes in `app/pages/`, app-wide composition in `app/app.vue`, and static files in `public/`. Keep page-specific content here and move reusable presentation into the shared UI layer.

## Development Commands

Run from the repository root:

- `pnpm dev:web`: start this app.
- `pnpm --filter @nuxt-app/web build`: build with the configured prerendering.
- `pnpm --filter @nuxt-app/web type-check`: check app types.
- `pnpm test --project web`: run this app's tests.
- `pnpm lint`: check repository style and accessibility rules.

## Rendering & Navigation

The home route is prerendered, and Nitro crawls links during prerendering. Keep public page rendering compatible with build-time execution; access browser-only APIs in client lifecycle hooks. Review prerender behavior when adding routes.

Use `useSite().linkTo(...)` for links between apps so environment-specific origins remain centralized. For programmatic navigation to another app, follow the existing `navigateTo(url, { external: true })` pattern. Set page metadata with `useHead()` and use the shared Nuxt UI components and theme tokens.

## Testing & Configuration

Place `*.spec.ts` tests in `test/` or beside code under `app/`. Follow `test/index.spec.ts`: mount pages with `mountSuspended`, mock Nuxt imports with `mockNuxtImport`, and verify visible content and navigation behavior. Run the `ui` test project when changing shared presentation.

Copy `.env.example` to `.env` for local URL overrides. Public runtime configuration is browser-visible; keep it limited to public values. Include screenshots in PRs that change the marketing page layout.
