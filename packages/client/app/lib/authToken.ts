// Session-token storage for bearer-mode clients.
//
// Cookie mode keeps the session in the browser's cookie jar and never touches
// this module. Bearer mode keeps the opaque session token in client storage
// instead, because a cross-origin WebView (a Capacitor app running on
// `capacitor://localhost` or `https://localhost`) refuses the API's
// cross-origin `Set-Cookie`.
//
// The interface is async so a native shell can back it with
// `@capacitor/preferences`, or a Keystore/Keychain-backed plugin, without an
// adapter. Apps reach it through `useAuthTokenStore()`.
//
// Internal to the client layer: composables import it directly, and it is not
// part of the public `#imports` surface.

const storageKey = 'nuxt-app.session-token'

export interface AuthTokenStore {
  read: () => Promise<string | null>
  write: (token: string) => Promise<void>
  clear: () => Promise<void>
}

// `localStorage` is absent during SSR, so every access is guarded. The store
// stays usable on the server; it just never holds a token there.
function webStorage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage
}

export const browserAuthTokenStore: AuthTokenStore = {
  read: async () => webStorage()?.getItem(storageKey) ?? null,
  write: async (token) => {
    webStorage()?.setItem(storageKey, token)
  },
  clear: async () => {
    webStorage()?.removeItem(storageKey)
  },
}

let store: AuthTokenStore = browserAuthTokenStore

// Replaces the backing store, e.g. with `@capacitor/preferences` in a native
// shell where `localStorage` is not guaranteed to survive an app update.
export function setAuthTokenStore(next: AuthTokenStore) {
  store = next
}

export function authTokenStore(): AuthTokenStore {
  return store
}

export function readAuthToken(): Promise<string | null> {
  return store.read()
}

export function writeAuthToken(token: string): Promise<void> {
  return store.write(token)
}

export function clearAuthToken(): Promise<void> {
  return store.clear()
}
