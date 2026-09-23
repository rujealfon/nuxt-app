# Repository guidelines

## Scope and structure

This user SPA extends `@nuxt-app/ui` and `@nuxt-app/client`.

Routes live in `app/pages/`. `index.vue` displays session state. Login and
registration routes import screens from `app/features/auth/index.ts`. Keep auth
UI and submission behavior in that feature's `ui/` directory, reusable UI in
`packages/ui`, auth and API composables in `packages/client`, and shared
validation schemas in `packages/types`.

## Authentication and API conventions

Use `useAuth()` for session state, sign-in, sign-up, and sign-out. Use
`loginSchema` and `registerSchema` from `@nuxt-app/types` in typed Nuxt UI
forms. Show loading state and submission errors, then navigate on success.

Use `useApi()` for versioned-route requests. For a failed request, call
`parseApiError`, branch on `error`, display `message` for general failures, and
map `invalid_input` details to form fields. Better Auth uses a separate client,
but its failures follow the same contract. `useAuth` throws
`AuthRequestError`, and `useAuthForm` converts its `fieldErrors` to form errors.
Registration and login are public. The home page supports both signed-in and
signed-out users.

## Testing and configuration

Run `pnpm test --project app` for this app. Add `*.spec.ts` files under `test/`
or `app/`. Existing tests use
`mountSuspended`, `mockNuxtImport`, and mocked auth actions. Cover successful
submissions, rejected requests, navigation, and session-dependent rendering.
Run the `client` or `unit` project when changing shared client logic or schemas.

Keep credentials and backend secrets in the API's server configuration. For
manual auth checks, follow the README's database setup and migration
instructions.
