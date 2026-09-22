import type { AuthTokenStore } from '../lib/authToken'
import { authTokenStore, setAuthTokenStore } from '../lib/authToken'

// The store bearer-mode clients keep the session token in (`authMode: 'bearer'`).
//
// Call it once at startup to replace the default `localStorage` implementation
// with one that outlives a WebView, such as `@capacitor/preferences`:
//
// ```ts
// useAuthTokenStore({
//   read: async () => (await Preferences.get({ key: 'session' })).value,
//   write: async (token) => { await Preferences.set({ key: 'session', value: token }) },
//   clear: async () => { await Preferences.remove({ key: 'session' }) },
// })
// ```
//
// Call it with no argument to read the store in use. Cookie-mode apps never need
// it: their session lives in the browser's cookie jar.
export function useAuthTokenStore(next?: AuthTokenStore): AuthTokenStore {
  if (next) {
    setAuthTokenStore(next)
  }

  return authTokenStore()
}
