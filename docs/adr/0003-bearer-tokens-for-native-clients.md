# Bearer tokens for native clients

Each app configures its session transport. `@nuxt-app/config` exports
`sessionTransportFor()`, and `@nuxt-app/client` defaults
`runtimeConfig.public.sessionTransport` to `'cookie'`. With
`NUXT_PUBLIC_SESSION_TRANSPORT=bearer`, the app sends its opaque session token
in an `Authorization` header. `useAuth()` builds the auth client from
`createSessionTransport()`, and `useApi()` attaches the header to
versioned-route requests. Both use `credentials: 'omit'`. `getActor` and `requireActor` already
forward request headers to `auth.getSession()`, so protected routes need no
transport-specific changes.

The API enables Better Auth's `bearer()` plugin only with
`AUTH_BEARER_ENABLED=true`. The plugin accepts the header token but also emits
`set-auth-token` on responses that set a session cookie. Better Auth includes
the session token in some auth JSON responses. Exposing either to browser app
JavaScript would weaken its HttpOnly cookie protection.

`AUTH_BEARER_ORIGINS` names the native WebView origins that may receive bearer
credentials. The auth route removes the header and session token JSON for any
other or missing origin. CORS exposes the header only to named origins. Those
origins must also appear in `CORS_ORIGINS`; startup validation rejects a missing
or wildcard bearer-origin list. Browser app origins stay outside that list.
Tests cover plugin registration, response filtering, header forwarding in
`getActor`, and the client's request shape. A full token-to-session-to-actor
test needs a database and is outside the current suite.

A Capacitor app runs from `capacitor://localhost` on iOS or
`https://localhost` on Android. API calls are cross-origin. WKWebView, Android
WebView, and Safari's ITP refuse the cross-origin `Set-Cookie` response. Sign-in
then succeeds, but the WebView drops the cookie and the next navigation finds
no session. Better Auth's cookie remedies require a reverse proxy or a shared
parent domain, neither of which the bundled WebView has.

Bearer mode stores the token on the client, which is weaker than an HttpOnly
cookie. Only deployments that enable bearer mode take on that risk.
`useAuthTokenStore()` lets a native shell use `@capacitor/preferences` or a
Keychain/Keystore plugin. `signIn.social()` cannot complete inside a WebView;
social sign-in needs the provider's native SDK and ID token forwarding, or a
custom-scheme callback. Email and password sign-in works.

## Considered options

- Pointing the WebView at the hosted SPA (`server.url`) so cookies are first-party: rejected. It needs no auth work, but it makes the native bundle a remote page whose launch depends on the network, discarding the bundled assets that are the reason to ship a shell at all.
- The JWT plugin instead of bearer: rejected. JWTs are for services that cannot use the session. The bearer token is the session and has one credential, expiry, and revocation path. `session.cookieCache` is not enabled, so no JWT exists to reuse.
- Bearer for every app, dropping cookies: rejected. It would move three working browser apps onto a transport they do not need, and put a token in `localStorage` where an HttpOnly cookie was strictly better.
- A second auth composable inside the Capacitor app: rejected. Only the transport differs; duplicating `getActor`/`signIn`/`signUp`/`signOut` would fork the session logic the layer exists to hold.
- Adding Capacitor's origins to `parseOrigins`' default list: rejected. That default also applies in production when `CORS_ORIGINS` is unset, and the real origin is `server.iosScheme`/`server.androidScheme` + `server.hostname`, so deployments opt in through `CORS_ORIGINS` instead.
- Registering the bearer plugin unconditionally: rejected. It emits `set-auth-token` on cookie sign-ins and would expose a replayable credential to every browser app's JavaScript. `AUTH_BEARER_ENABLED` gates registration.
- Sending `set-auth-token` to every CORS origin: rejected. A native WebView supplies an origin distinct from the browser apps in this deployment, so the API only retains and exposes the header for explicitly configured native origins.
