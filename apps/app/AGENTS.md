# User app guide

Apply the [root guide](../../AGENTS.md). Paths below are relative to `apps/app`.

## Placement

This SPA extends the UI and client layers. Keep login and registration screens
in `app/features/auth/`, exported through its `index.ts`; routes compose them.
Keep reusable UI in `packages/ui`, auth and HTTP composables in
`packages/client`, and shared validation schemas in `packages/types`.

## Auth and data

Import client composables from `#imports`. Use `useAuth()` for sessions and auth
actions. Password screens combine `usePasswordAuthScreen()` with
`AuthScreen` from `@nuxt-app/ui/components/AuthScreen.vue`. Pass all `screenProps`
so validation, loading state, and field errors reach the form. Keep screen copy
and destinations in the feature.

Use `useSignOut()` for sign-out loading state. The home page remains in place
after sign-out and supports both signed-in and signed-out users. Login and
registration are public.

Use `useApi().api` for versioned requests and `useApiFetch()` for Nuxt fetches
through the same client. Parse failures with `parseApiError`, branch on `error`,
show `message` for general failures, and map `invalid_input` details to fields.
`useAuth()` throws `AuthRequestError`; `useAuthForm` maps its field errors.

Keep remote query state in the client layer's Pinia Colada cache, temporary
form state local, and shared client state in Pinia when needed.
For native bearer transport or token storage changes, read
[ADR 0003](../../docs/adr/0003-bearer-tokens-for-native-clients.md) and follow
[native client setup](../../docs/api-client.md#native-capacitor-app).

## Tests

Run `pnpm test --project app`. Follow existing `mountSuspended` and
`mockNuxtImport` tests. Cover submission success, rejected requests, navigation,
and session-dependent rendering. Also run the `client` or `unit` project when
changing shared client behavior or validation schemas.
