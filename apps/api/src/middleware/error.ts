import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message || 'Request failed' }, err.status)
  }

  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
}
