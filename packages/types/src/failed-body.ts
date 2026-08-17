export function failedResponseBody(message: string) {
  return { message }
}

export function messageFromFailedBody(data: unknown, fallback = 'Request failed'): string {
  if (!data || typeof data !== 'object')
    return fallback

  const body = data as {
    message?: unknown
    error?: unknown
  }

  if (typeof body.error === 'object' && body.error) {
    const issues = (body.error as { issues?: Array<{ message?: unknown }> }).issues
    const issue = issues?.[0]?.message
    if (typeof issue === 'string' && issue)
      return issue
  }

  if (typeof body.error === 'string' && body.error)
    return body.error

  if (typeof body.message === 'string' && body.message)
    return body.message

  return fallback
}
