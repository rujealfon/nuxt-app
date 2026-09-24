# User app guide

Read the [root guide](../../AGENTS.md) for workspace setup and verification.

## Scope and structure

This user SPA extends `@nuxt-app/ui` and `@nuxt-app/client`.

Routes live in `app/pages/`. `index.vue` displays session state. Login and
registration routes import screens from `app/features/auth/index.ts`. Keep auth
UI and submission behavior in that feature's `ui/` directory, reusable UI in
`packages/ui`, auth and API composables in `packages/client`, and shared
validation schemas in `packages/types`.

## Authentication and API conventions

Import client composables through `#imports`. Use `useAuth()` for session state
and auth actions. Password screens combine `usePasswordAuthScreen()` with
`AuthScreen` from `@nuxt-app/ui/components/AuthScreen.vue`; pass all `screenProps`
so shared schemas, loading state, and field errors reach the form. Keep screen
copy and destinations in the feature. Use `useSignOut()` for sign-out loading
state; the current home page stays in place after sign-out.

Use the `api` client returned by `useApi()` for versioned-route requests.
`useApiFetch()` provides the Nuxt fetch path through the same client.
For a failed request, call
`parseApiError`, branch on `error`, display `message` for general failures, and
map `invalid_input` details to form fields. Better Auth uses a separate client,
but its failures follow the same contract. `useAuth` throws
`AuthRequestError`, and `useAuthForm` converts its `fieldErrors` to form errors.
Registration and login are public. The home page supports both signed-in and
signed-out users.

Keep remote query state in the Pinia Colada cache provided by the client layer,
temporary form state local, and shared client state in Pinia when needed.
Browser sessions use cookies by default. For native bearer transport or token
storage changes, read [ADR 0003](../../docs/adr/0003-bearer-tokens-for-native-clients.md)
and the README's native app setup; configure transport through the shared client.

## Testing and configuration

Run `pnpm test --project app` for this app. Add `*.spec.ts` files under `test/`
or `app/`. Existing tests use
`mountSuspended`, `mockNuxtImport`, and mocked auth actions. Cover successful
submissions, rejected requests, navigation, and session-dependent rendering.
Run the `client` or `unit` project when changing shared client logic or schemas.

Keep credentials and backend secrets in the API's server configuration. For
manual auth checks, follow the README's database setup and migration
instructions.
