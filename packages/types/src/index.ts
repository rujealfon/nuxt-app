export interface SessionUser {
  id: string
  email: string
  name: string
  roles: string[]
}

export interface ApiError {
  statusCode: number
  statusMessage: string
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object'
    && value !== null
    && 'statusCode' in value
    && 'statusMessage' in value
  )
}
