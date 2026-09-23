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

// `localStorage` is absent during SSR. Storage errors are handled by the
// session operations below, including errors from native stores.
function webStorage(): Storage | null {
  return import.meta.client ? localStorage : null
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
let customStoreInstalled = false
let storageInvalidated = false
let mutations: Promise<void> = Promise.resolve()

// Native stores are asynchronous. Order mutations so a slow clear cannot
// erase a later sign-in, and compare request tokens inside that same queue.
function mutateStore(operation: () => Promise<void>): Promise<void> {
  const result = mutations.then(operation)
  mutations = result.catch(() => {})
  return result
}

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
  storageInvalidated = false
  mutations = Promise.resolve()
}

export function authTokenStore(): AuthTokenStore {
  return store
}

function warnStoreFailure(operation: string, error: unknown) {
  console.warn(`[auth] token store ${operation} failed; continuing without a stored token`, error)
}

export async function readAuthToken(): Promise<string | null> {
  await mutations
  if (storageInvalidated) {
    return null
  }

  try {
    return await store.read()
  }
  catch (error) {
    warnStoreFailure('read', error)
    return null
  }
}

export function writeAuthToken(token: string): Promise<void> {
  return mutateStore(async () => {
    storageInvalidated = true
    try {
      await store.write(token)
      storageInvalidated = false
    }
    catch (cause) {
      // Remove the previous account's credential if storage still permits it.
      // Even if removal fails, reads remain disabled until a successful mutation.
      await store.clear().catch(() => {})
      throw new Error('Unable to save the session token. Please try signing in again.', { cause })
    }
  })
}

export function clearAuthToken(expectedToken?: string): Promise<void> {
  return mutateStore(async () => {
    if (expectedToken !== undefined && (storageInvalidated || await store.read() !== expectedToken)) {
      return
    }

    storageInvalidated = true
    try {
      await store.clear()
      storageInvalidated = false
    }
    catch (cause) {
      throw new Error('Unable to remove the saved session token. Please retry signing out before closing the app.', { cause })
    }
  })
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
