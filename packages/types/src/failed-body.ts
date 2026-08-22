import { z } from 'zod'

const errorIssuesSchema = z.object({
  issues: z.array(z.object({ message: z.string().optional() })).optional(),
})

export function failedResponseBody(message: string) {
  return { message }
}

export function messageFromFailedBody(data: unknown, fallback = 'Request failed'): string {
  if (!data || typeof data !== 'object')
    return fallback

  const body = data as Record<string, unknown>

  if (typeof body.error === 'object' && body.error) {
    const parsed = errorIssuesSchema.safeParse(body.error)
    const issue = parsed.success ? parsed.data.issues?.[0]?.message : undefined
    if (issue)
      return issue
  }

  if (typeof body.error === 'string' && body.error)
    return body.error

  if (typeof body.message === 'string' && body.message)
    return body.message

  return fallback
}
