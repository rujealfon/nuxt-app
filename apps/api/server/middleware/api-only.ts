// This app is an API. Nuxt still mounts a Vue renderer on `/**`, which is the
// welcome page when there is no `app.vue`. Reject anything that is not an API
// path so browsers get the product error contract instead of HTML. Nitro/Vite
// internals (`/_nuxt`, `/__nuxt_*`, `/@vite`) stay reachable in dev.
export default defineEventHandler((event) => {
  const path = event.path.split('?')[0] ?? '/'

  if (path === '/api' || path.startsWith('/api/')) {
    return
  }

  if (path.startsWith('/_') || path.startsWith('/__') || path.startsWith('/@')) {
    return
  }

  throw productFailure('not_found')
})
