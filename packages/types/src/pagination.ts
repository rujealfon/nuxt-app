import { z } from 'zod'

const cursorSchema = z.string().min(1)

export const paginationQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.union([z.number(), z.string().regex(/^\d+$/)])
    .pipe(z.coerce.number<string | number>().int().min(1).max(100))
    .default(20),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

const pageSchema = z.union([z.number(), z.string().regex(/^\d+$/)])
  .pipe(z.coerce.number<string | number>().int().min(1))
  .default(1)

const pageSizeSchema = z.union([z.number(), z.string().regex(/^\d+$/)])
  .pipe(z.coerce.number<string | number>().int().min(1).max(100))
  .default(20)

export const pageNumberQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
})

export type PageNumberQuery = z.infer<typeof pageNumberQuerySchema>

export function createPageNumberResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().min(0),
  })
}

export type PageNumberResponse<T> = z.infer<ReturnType<typeof createPageNumberResponseSchema<z.ZodType<T>>>>

export function createPaginationResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: cursorSchema.nullable(),
    hasMore: z.boolean(),
  }).refine(
    page => page.hasMore === (page.nextCursor !== null),
    { message: 'hasMore must match the presence of nextCursor', path: ['hasMore'] },
  )
}

export type PaginationResponse<T> = z.infer<ReturnType<typeof createPaginationResponseSchema<z.ZodType<T>>>>
