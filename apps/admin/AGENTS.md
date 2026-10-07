# Admin app guide

Apply the [root guide](../../AGENTS.md). Paths below are relative to `apps/admin`.

## Placement

This SPA extends the UI and client layers. The login route composes
`AdminLoginScreen` from `app/features/auth/index.ts`. Keep login behavior in
that feature, reusable UI in `packages/ui`, and shared auth in `packages/client`.
Preserve `noindex, nofollow` metadata when changing the Nuxt configuration.

## Access and auth

`app/middleware/auth.global.ts` leaves `/login` public. Other routes call
`useAuth().getActor()` and require `actor.role === 'admin'`. Redirect denied
users to login with the requested path in the query. Route checks control
navigation; privileged API operations require server authorization too.

Import client composables from `#imports`. Combine `useAuth().signIn`,
`usePasswordAuthScreen()`, and the shared `AuthScreen`; pass all `screenProps`.
The helper uses `useAuthForm` to sanitize redirects to an in-app path.
Use `useSignOut('/login')` to navigate after successful sign-out.
For a local admin account, follow [seeding](../../docs/database.md#seeding).

Use `useApi().api` for versioned requests and its `parseApiError` for failures.
Branch on `error`, show `message`, and map `invalid_input` details to fields.
Keep remote queries in Pinia Colada, form state local, and shared client state
in Pinia when needed.

## Tests

Run `pnpm test --project admin`. Follow `test/auth-middleware.spec.ts` to cover
public login, missing sessions, non-admin users, and admins. Cover successful
and failed submissions, requested-path redirects, and external or malformed
redirect targets. Use `mountSuspended` with mocked auth actions.
Also run `pnpm test --project client` when changing shared auth behavior.
