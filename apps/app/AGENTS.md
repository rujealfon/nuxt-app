# Repository Guidelines

## Scope & Structure

Follow the shared style and PR guidance in [the root guide](../../AGENTS.md). This directory contains the user-facing SPA, running on port 3001 with `ssr: false`. It extends `@nuxt-app/ui` and `@nuxt-app/client`.

Routes live in `app/pages/`: `index.vue` displays session state; login and registration routes compose screens exported by `app/features/auth/index.ts`. Auth UI and submission behavior live in that feature’s `ui/` directory. Keep reusable UI in `packages/ui`, auth/API composables in `packages/client`, and shared validation schemas in `packages/types`.

## Development Commands

Run from the repository root:

- `pnpm dev:app`: start the SPA.
- `pnpm dev:api`: start the backend for interactive authentication testing.
- `pnpm --filter @nuxt-app/app build`: build this app.
- `pnpm --filter @nuxt-app/app type-check`: check app types.
- `pnpm test --project app`: run page tests.
- `pnpm lint`: check repository style.

## Authentication & API Conventions

Use `useAuth()` for session state, sign-in, sign-up, and sign-out. Reuse `loginSchema` and `registerSchema` from `@nuxt-app/types` with typed Nuxt UI forms. Keep loading indicators, submission errors, and successful navigation explicit in page behavior.

Use the shared `useApi()` composable for versioned API requests. Parse a caught versioned-route failure with `parseApiError`: branch on `error`, show `message` as the catch-all, and map `details` onto fields for `invalid_input`. Better Auth uses its own client and is not this contract. Preserve the current distinction between the public registration/login pages and session-dependent content. The home page currently supports both signed-in and signed-out users.

## Testing & Configuration

Add `*.spec.ts` files under `test/` or `app/`. Existing tests use `mountSuspended`, `mockNuxtImport`, and mocked authentication actions. Cover successful submissions, rejected requests, navigation, and session-dependent rendering. Run the `client` or `unit` project when changing shared client logic or schemas.

Copy `.env.example` to `.env` and configure public API and app URLs for local development. Keep credentials and backend secrets in the API’s server configuration. For manual auth checks, follow the root README’s database setup and migration instructions.
