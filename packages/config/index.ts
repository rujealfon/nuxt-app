export const APP_DOMAIN = 'mysite.com'

export const appPorts = {
  web: 3000,
  app: 3001,
  admin: 3002,
  api: 3003,
} as const

export type AppName = keyof typeof appPorts

export function apiBaseFor(env: string | undefined): string {
  return env || `http://localhost:${appPorts.api}`
}

export const cookieName = 'mysite_session'
