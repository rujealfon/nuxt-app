import { defineEventHandler } from 'h3'
import { handleAuthRequest } from '#server/services/auth'

// The whole auth pipeline lives in `services/auth`; this route only forwards.
export default defineEventHandler(event => handleAuthRequest(event))
