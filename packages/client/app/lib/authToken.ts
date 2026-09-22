// Session-token storage for bearer-mode clients. Cookie mode keeps the session
// in the browser's cookie jar and never touches this module. Rationale:
// docs/adr/0003-bearer-tokens-for-native-clients.md.
//
// The interface is async so a native shell can back it with
// `@capacitor/preferences` or a Keychain/Keystore plugin without an adapter.
// Apps reach it through `useAuthTokenStore()`.

const storageKey = 'nuxt-app.session-token'
const issuedTokenHeader = 'set-auth-token'

export interface AuthTokenStore {
  read: () => Promise<string | null>
  write: (token: string) => Promise<void>
  clear: () => Promise<void>
}

// `localStorage` is absent during SSR, and throws when the browser blocks or
// exhausts storage. Every access is guarded: the store degrades to "no token"
// rather than failing the request that touched it.
function webStorage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage
}

export const browserAuthTokenStore: AuthTokenStore = {
  read: async () => {
    try {
      return webStorage()?.getItem(storageKey) ?? null
    }
    catch {
      return null
    }
  },
  write: async (token) => {
    try {
      webStorage()?.setItem(storageKey, token)
    }
    catch {
      // Full or blocked storage: the token lives only for this page load.
    }
  },
  clear: async () => {
    try {
      webStorage()?.removeItem(storageKey)
    }
    catch {
      // Nothing was removable.
    }
  },
}

let store: AuthTokenStore = browserAuthTokenStore
let customStoreInstalled = false

// Installs the backing store once. Replacing an installed store could strand a
// token in the old store and make the next request appear signed out.
export function installAuthTokenStore(next: AuthTokenStore): boolean {
  if (customStoreInstalled) {
    return false
  }

  store = next
  customStoreInstalled = true
  return true
}

// Test support for restoring module state between specs.
export function resetAuthTokenStoreState() {
  store = browserAuthTokenStore
  customStoreInstalled = false
}

export function authTokenStore(): AuthTokenStore {
  return store
}

function warnStoreFailure(operation: string, error: unknown) {
  console.warn(`[auth] token store ${operation} failed; continuing without a stored token`, error)
}

// Storage is best-effort. A store that rejects must not fail a request, nor a
// sign-in that already succeeded on the server.
export async function readAuthToken(): Promise<string | null> {
  try {
    return await store.read()
  }
  catch (error) {
    warnStoreFailure('read', error)
    return null
  }
}

export async function writeAuthToken(token: string): Promise<void> {
  try {
    await store.write(token)
  }
  catch (error) {
    warnStoreFailure('write', error)
  }
}

export async function clearAuthToken(): Promise<void> {
  try {
    await store.clear()
  }
  catch (error) {
    warnStoreFailure('clear', error)
  }
}

// Every response that creates or refreshes a session carries the token in
// `set-auth-token`. The CORS middleware must expose that header or cross-origin
// JS reads `null` and a bearer sign-in stores nothing.
export async function captureIssuedToken(response: Response): Promise<void> {
  const token = response.headers.get(issuedTokenHeader)

  if (token) {
    await writeAuthToken(token)
  }
}
