import { useRuntimeConfig } from 'nitropack/runtime'
import { handleAuthRequest } from '#server/services/auth'
import { defineResultHandler } from '#server/utils/result-handler'

// The whole auth pipeline lives in `services/auth`; this route supplies the runtime
// config, forwards, and turns an expected failure into the API error contract at the HTTP edge.
export default defineResultHandler(event => handleAuthRequest(event, useRuntimeConfig(event)))
