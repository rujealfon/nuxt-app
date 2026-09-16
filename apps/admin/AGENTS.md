# Repository Guidelines

## Scope & Structure

Follow the shared conventions and PR checks in [the root guide](../../AGENTS.md). This directory contains the administrator SPA, running on port 3002 with `ssr: false`. It extends `@nuxt-app/ui` and `@nuxt-app/client`; reusable components and authentication helpers belong in those packages.

Pages live in `app/pages/`, and `app/middleware/auth.global.ts` controls route access. The Nuxt configuration adds `noindex, nofollow` metadata; preserve it when changing app metadata.

## Development Commands

Run from the repository root:

- `pnpm dev:admin`: start the admin interface.
- `pnpm dev:api`: start the backend for manual sign-in checks.
- `pnpm --filter @nuxt-app/admin build`: build this app.
- `pnpm --filter @nuxt-app/admin type-check`: check app types.
- `pnpm test --project admin`: run middleware and page tests.
- `pnpm lint`: check repository style and accessibility.

## Access & Authentication

Keep `/login` accessible without a session. Other routes fetch the session with `useAuthClient().getSession()` and require `user.role === 'admin'`. Preserve the redirect query containing the requested path when sending a user to login, and validate redirect handling when changing the sign-in flow.

Use `useAuth()` and the shared `loginSchema` for login forms. Client route checks control navigation; privileged API operations must also enforce authorization on the server. Use the root README’s seed workflow when a local administrator account is needed.

## Testing & Configuration

Place `*.spec.ts` tests under `test/` or `app/`. Follow `test/auth-middleware.spec.ts` to cover the login exemption, missing sessions, non-admin users, and authorized admins. Page tests should cover submission success and failure using mocked auth actions and `mountSuspended`.

Copy `.env.example` to `.env` for public API and cross-app URLs. Keep secrets in server configuration. Run the `client` test project when modifying shared auth behavior, and include screenshots for visible admin interface changes.
