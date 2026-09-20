import { randomUUID } from 'node:crypto'
import { getHeader, setHeader } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'
import { useLogger } from '../utils/logger'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const requestId = getHeader(event, 'x-request-id') || randomUUID()

    event.context.requestId = requestId
    event.context.logger = useLogger().child({ requestId })
    setHeader(event, 'x-request-id', requestId)
  })
})
