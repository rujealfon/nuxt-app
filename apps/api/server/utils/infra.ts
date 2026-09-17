import { z } from 'zod'

// Infra 200 bodies. Versioned-route contracts live in `@nuxt-app/types`;
// health and the version registry keep their own shapes, parsed here so the
// OpenAPI document cannot drift from what the handlers return.

export const healthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
  timestamp: z.iso.datetime(),
})

export type HealthResponse = z.infer<typeof healthResponseSchema>

export const readyResponseSchema = z.object({
  database: z.boolean(),
  redis: z.boolean(),
})

export type ReadyResponse = z.infer<typeof readyResponseSchema>

export const versionRegistrySchema = z.object({
  current: z.string(),
  versions: z.array(z.object({
    version: z.string(),
    deprecated: z.boolean(),
    sunset: z.string().optional(),
  })),
})

export type VersionRegistry = z.infer<typeof versionRegistrySchema>
