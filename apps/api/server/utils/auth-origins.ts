import { isExplicitOrigin } from './bearer-origin'

// Better Auth interprets * and ? as patterns, including in URL hostnames.
// Cookie authentication must trust complete origins, including native schemes.
export function assertAuthOrigins(origins: string[]): void {
  if (origins.some(origin => origin.includes('*') || origin.includes('?') || !isExplicitOrigin(origin))) {
    throw new Error('Authentication requires explicit origins without wildcards or paths')
  }
}
