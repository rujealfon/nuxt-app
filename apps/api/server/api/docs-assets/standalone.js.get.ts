import { defineEventHandler, setHeader } from 'h3'
import { useStorage } from 'nitropack/runtime'
import { domainFailure } from '../../utils/domain-failure'

// Self-hosted Scalar UI bundle so `/api/docs` works offline and stays
// version-pinned with the API. Embedded at build time through
// `nitro.serverAssets` (the package has no subpath export for a bundler
// import, and `publicAssets` bypass middleware). The docs guard applies, so
// the bundle 404s with everything else in production builds.
export default defineEventHandler(async (event) => {
  const bundle = await useStorage('assets:scalar-docs').getItem('standalone.js')

  if (typeof bundle !== 'string' || bundle.length === 0) {
    throw domainFailure('internal_error')
  }

  setHeader(event, 'content-type', 'text/javascript; charset=utf-8')
  setHeader(event, 'cache-control', 'no-store')

  return bundle
})
