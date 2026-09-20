import type { Logger } from '@nuxt-app/logger'
import { defineEventHandler, getMethod, getResponseStatus } from 'h3'
import { useLogger } from '../utils/logger'

// Monitoring hits health checks constantly, so keep routine successes at debug
// to avoid filling the request log.
const HEALTH_PREFIX = '/api/health'

export default defineEventHandler((event) => {
  const start = performance.now()
  const logger: Logger = event.context.logger || useLogger()
  const path = event.path
  const quiet = path.startsWith(HEALTH_PREFIX)

  event.node.res.on('finish', () => {
    const status = getResponseStatus(event)
    const entry = {
      method: getMethod(event),
      path,
      status,
      durationMs: Math.round(performance.now() - start),
    }

    if (status >= 500) {
      logger.error(entry, 'request failed')
    }
    else if (status >= 400) {
      logger.warn(entry, 'request completed')
    }
    else if (quiet) {
      logger.debug(entry, 'request completed')
    }
    else {
      logger.info(entry, 'request completed')
    }
  })
})
