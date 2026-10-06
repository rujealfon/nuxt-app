# API clients

## API versioning

Versioned routes are path-versioned under `/api/<version>/`. Infrastructure routes are
unversioned: `/api/auth/*` (Better Auth), `/api/health*` (monitoring),
`GET /api` (version registry), and `/api/docs` + `/api/openapi.json` (Scalar
API docs, development-only, self-hosted from the installed `@scalar/api-reference`
bundle). A missing or unknown version (for example `/api/hello`, `/api/v9/hello`)
returns a JSON `404`, so clients must be explicit about the version.

The registry lives in `packages/config` (`apiVersions`, `currentApiVersion`,
`deprecatedApiVersions`), the single registry shared by the API and the
frontends. `GET /api` reports what's available:

```json
{ "current": "v1", "versions": [{ "version": "v1", "deprecated": false }] }
```

For endpoint implementation, follow the [API guide](../apps/api/AGENTS.md).
`defineVersionedHandler` sets `X-Api-Version` and adds `Deprecation` and `Sunset`
headers for entries in `deprecatedApiVersions`.

To ship a new version:

1. Add `server/api/v2/**` handlers, reusing `server/services/` where behavior is
   unchanged.
2. Append `'v2'` to `apiVersions` and set `currentApiVersion = 'v2'`.
3. Add and export the `v2` contracts namespace in `packages/types`, including its
   `operations` list. Register it in `packages/config`'s `versionedOperations`.
4. Mark the old version in `deprecatedApiVersions` with a sunset date. Preserve
   the registry's `Object.freeze` wrapper.
5. Run `pnpm test --project unit test/version-parity.spec.ts` to check that
   routes, contract namespaces, and documented operations agree. Run the root
   guide's checks and build before handing off the version change.
6. When retiring the old version after its sunset date, remove its routes,
   contract namespace, and version, operation, and deprecation registry entries.

Frontends target a version with `NUXT_PUBLIC_API_VERSION` (defaults to
`currentApiVersion`). Import `useApi` from `#imports` in apps extending the
client layer. It returns `{ api, parseApiError }`; `api` is a `$fetch` instance
scoped to `<apiBase>/api/<version>` (carrying the session per the
configured [session transport](#native-capacitor-app)). `useApiFetch()` provides
the SSR-aware Nuxt fetch path with the same authenticated client. Better Auth
keeps its own unversioned client internal to `useAuth()`.

For failed API requests, call `parseApiError`, branch on `error`, and map
`invalid_input` details to fields. See [backend patterns](backend-patterns.md)
for the shared error contract.

## Native (Capacitor) app

The shared client supports bearer transport for native WebViews whose cross-origin
requests cannot retain the API session cookie. This is a transport integration
guide; the repository has no Capacitor shell. Read
[ADR 0003](adr/0003-bearer-tokens-for-native-clients.md) before changing token
issuance or storage.

1. Set `AUTH_BEARER_ENABLED=true` on the API deployment. Set
   `AUTH_BEARER_ORIGINS` to the native WebView origins, for example
   `capacitor://localhost,https://localhost`, and add them to `CORS_ORIGINS`.
   The API exposes bearer credentials only to these origins. Leave browser app
   origins out of `AUTH_BEARER_ORIGINS` to retain their HttpOnly cookies.
2. Set `NUXT_PUBLIC_SESSION_TRANSPORT=bearer` in the app's environment.
   `useAuth()` and `useApi()` then send the session token in an `Authorization`
   header and stop using cookies. `sessionTransportFor()` keeps cookies for any
   other value.
3. Confirm the WebView origin on the device by logging `window.location.origin`.
   It comes from `server.iosScheme` or `server.androidScheme` and
   `server.hostname`. The defaults are `capacitor://localhost` on iOS and
   `https://localhost` on Android. `CORS_ORIGINS` also feeds Better Auth's
   `trustedOrigins`; a missing origin makes sign-in fail with `403`.
4. Optionally replace token storage. The default is `localStorage`; call
   `useAuthTokenStore()` once at startup with a store backed by
   `@capacitor/preferences` (or a Keychain/Keystore plugin), which can persist
   across a WebView data eviction. It accepts any `{ read, write, clear }` whose
   members return promises.

   A failed token write or clear rejects the authentication action and prevents
   further token reads in that app session until storage recovers through a
   successful write or clear. Failed writes also attempt to remove the previous
   token. If cleanup fails, retry sign-out before closing the app: the underlying
   storage may still contain the old token after a restart.

Verify setup on the device with sign-in, an authenticated versioned request,
and sign-out. Check that a request after sign-out no longer authenticates.
`requireActor` resolves bearer sessions through the existing authorization header.

The current screens implement email and password authentication. A native
social sign-in flow needs its own provider integration and callback handling.

## Authentication and rate limiting

Better Auth configuration lives in
[`apps/api/server/database/auth.ts`](../apps/api/server/database/auth.ts). The
auth catch-all delegates validation, origin-based bearer filtering, and error
conversion to `server/services/auth`. Sessions live in Postgres. Browser clients
use HttpOnly cookies; native clients use the transport setup above.

Both auth and API rate limits use Redis counters. The default policy lives in
[`rate-limit-policy.ts`](../apps/api/server/utils/rate-limit-policy.ts); Better
Auth also applies stricter rules to sensitive endpoints. The API middleware
limits known operations per IP, method, and route. Unknown operations share one
bucket per IP, so arbitrary paths cannot create unbounded keys. Auth, health,
docs, and the bare `/api` registry are exempt from that middleware.
`RATE_LIMIT_ENABLED=false` disables the API middleware limiter only; Better
Auth's limiter remains enabled.
