// This app is an API. Nuxt still mounts a Vue renderer on `/**`, which is the
// welcome page when there is no `app.vue`. Reject anything that is not an API
// path so browsers get the API error contract instead of HTML. Nitro/Vite
// internals (`/_nuxt`, `/__nuxt_*`, `/@vite`) stay reachable in dev.
import { requestPath } from '../utils/api-paths'

export default defineEventHandler((event) => {
  const path = requestPath(event)

  if (path === '/api' || path.startsWith('/api/')) {
    return
  }

  if (path.startsWith('/_') || path.startsWith('/__') || path.startsWith('/@')) {
    return
  }

  throw domainFailure('not_found')
})
