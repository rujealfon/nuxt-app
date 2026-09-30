// Only server-resolved addresses may reach Better Auth's limiter and metadata.
// Kept free of h3/Nitro so the auth factory can also run in CLI scripts.
export const authClientIpHeader = 'x-auth-client-ip'
