import process from 'node:process'
import { isVercelPreviewHost } from '@nuxt-app/auth'
import { createError, defineEventHandler, getRequestURL, proxyRequest } from 'h3'
import { apiProxyTarget, resolveApiProxyOrigin, vercelProtectionBypassHeaders } from '../../utils/api-proxy'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiUrl = resolveApiProxyOrigin(String(config.public.apiUrl || ''))
  const target = apiProxyTarget(apiUrl, getRequestURL(event).href)
  const hostname = new URL(target).hostname
  const origin = new URL(target).origin
  const secret = String(config.apiProtectionBypass || process.env.NUXT_API_PROTECTION_BYPASS || '')
  const headers = vercelProtectionBypassHeaders(secret, hostname)

  if (isVercelPreviewHost(hostname) && !headers['x-vercel-protection-bypass']) {
    throw createError({
      statusCode: 503,
      message: `Set NUXT_API_PROTECTION_BYPASS on this project (API Protection Bypass secret), then redeploy. Proxy target: ${origin}`,
    })
  }

  try {
    return await proxyRequest(event, target, {
      headers,
      fetchOptions: {
        redirect: 'manual',
        signal: AbortSignal.timeout(20_000),
      },
    })
  }
  catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 502,
      message: `API proxy failed (${origin}): ${reason}`,
    })
  }
})
