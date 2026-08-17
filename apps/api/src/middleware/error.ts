import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import * as HttpStatusPhrases from 'stoker/http-status-phrases'

export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ message: err.message || HttpStatusPhrases.BAD_REQUEST }, err.status)
  }

  c.var.logger?.error(err)
  return c.json({ message: HttpStatusPhrases.INTERNAL_SERVER_ERROR }, HttpStatusCodes.INTERNAL_SERVER_ERROR)
}
