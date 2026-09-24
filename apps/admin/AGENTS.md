# Admin app guide

Read the [root guide](../../AGENTS.md) for workspace setup and verification.

## Scope and structure

This admin SPA extends `@nuxt-app/ui` and `@nuxt-app/client`. Put reusable
components and authentication helpers in those packages.

Pages live in `app/pages/`. The login route imports `AdminLoginScreen` from
`app/features/auth/index.ts`; keep login UI and submission behavior there.
`app/middleware/auth.global.ts` controls route access. Preserve the Nuxt
configuration's `noindex, nofollow` metadata when changing app metadata.

## Access and authentication

Keep `/login` accessible without a session. Other routes call
`useAuth().getActor()` and require `actor.role === 'admin'`. When redirecting to
login, keep the requested path in the query. Test redirect handling when
changing sign-in.

Import client composables through `#imports`. The login screen combines
`useAuth().signIn`, `usePasswordAuthScreen()`, and the shared UI `AuthScreen`.
Pass all `screenProps` to preserve schema validation, loading state, and field
errors. Let `useAuthForm`, through that helper, sanitize the requested redirect
to an in-app path. Keep coverage for external and malformed redirect targets.
Use `useSignOut('/login')` so navigation follows a successful sign-out.

Client route checks control navigation. Privileged API operations also need
server authorization. Use the [README's seed workflow](../../README.md) to
create a local admin account. Browser sessions use the shared client's default
cookie transport.

Use `useApi().api` for versioned API calls and `parseApiError` from `useApi()`
for failures. Keep remote query state in the client layer's Pinia Colada cache,
temporary form state local, and shared client state in Pinia when needed.

## Testing and configuration

Run `pnpm test --project admin` for this app. Place `*.spec.ts` tests under
`test/` or `app/`. Follow
`test/auth-middleware.spec.ts` to cover public login, missing sessions,
non-admin users, and admins. Test page submission success and failure with
mocked auth actions and `mountSuspended`.

Keep secrets in server configuration. Run the `client` test project when changing shared auth
behavior. Include screenshots for visible admin interface changes.
