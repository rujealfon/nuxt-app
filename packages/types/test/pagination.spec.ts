import type { PageNumberQuery, PageNumberResponse, PaginationQuery, PaginationResponse } from '../src'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'
import { createPageNumberResponseSchema, createPaginationResponseSchema, pageNumberQuerySchema, paginationQuerySchema } from '../src'

describe('pagination query contract', () => {
  it('defaults to the first page with a limit of 20', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ limit: 20 })
    expectTypeOf<PaginationQuery>().toEqualTypeOf<{ cursor?: string, limit: number }>()
  })

  it.each([1, 20, 100, '1', '20', '100'])('accepts limit %j', (limit) => {
    expect(paginationQuerySchema.parse({ limit })).toEqual({ limit: Number(limit) })
  })

  it.each([
    0,
    -1,
    101,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    '',
    ' ',
    '0',
    '-1',
    '101',
    '1.5',
    'abc',
    '1e2',
    '0x10',
    null,
    true,
    false,
    [],
    ['20'],
    ['20', '30'],
    {},
  ].map(limit => ({ limit })))('rejects invalid limit $limit', ({ limit }) => {
    const result = paginationQuerySchema.safeParse({ limit })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues[0]?.path).toEqual(['limit'])
  })

  it('preserves an opaque cursor without decoding it', () => {
    expect(paginationQuerySchema.parse({ cursor: 'opaque+/=', limit: '10' }))
      .toEqual({ cursor: 'opaque+/=', limit: 10 })
  })

  it.each(['', null, 123, true, [], ['cursor'], {}].map(cursor => ({ cursor })))('rejects invalid cursor $cursor', ({ cursor }) => {
    expect(paginationQuerySchema.safeParse({ cursor }).success).toBe(false)
  })

  it('composes with resource-specific filters', () => {
    const querySchema = paginationQuerySchema.extend({ status: z.enum(['active', 'archived']) })
    expect(querySchema.parse({ status: 'active' })).toEqual({ status: 'active', limit: 20 })
  })
})

describe('pagination response contract', () => {
  const itemSchema = z.object({ id: z.string(), name: z.string() })
  const responseSchema = createPaginationResponseSchema(itemSchema)
  const items = [{ id: '1', name: 'First' }]

  it('infers the item type in the response', () => {
    expectTypeOf<z.infer<typeof responseSchema>>().toEqualTypeOf<{
      items: { id: string, name: string }[]
      nextCursor: string | null
      hasMore: boolean
    }>()
    expectTypeOf<PaginationResponse<z.infer<typeof itemSchema>>>()
      .toEqualTypeOf<z.infer<typeof responseSchema>>()
  })

  it('accepts a page with more results', () => {
    const page = { items, nextCursor: 'next', hasMore: true }
    expect(responseSchema.parse(page)).toEqual(page)
  })

  it.each([{ items }, { items: [] }])('accepts a terminal page with items $items', ({ items }) => {
    const page = { items, nextCursor: null, hasMore: false }
    expect(responseSchema.parse(page)).toEqual(page)
  })

  it.each([
    { nextCursor: null, hasMore: true },
    { nextCursor: 'next', hasMore: false },
  ])('rejects inconsistent metadata %j', (metadata) => {
    const result = responseSchema.safeParse({ items, ...metadata })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues[0]?.path).toEqual(['hasMore'])
  })

  it.each([
    { items },
    { items, nextCursor: null },
    { items, hasMore: false },
    { nextCursor: null, hasMore: false },
    { items, nextCursor: '', hasMore: true },
    { items, nextCursor: 1, hasMore: true },
    { items, nextCursor: null, hasMore: 'false' },
    { items: {}, nextCursor: null, hasMore: false },
    { items: [{ id: 1, name: 'First' }], nextCursor: null, hasMore: false },
    { items: [{ id: '1' }], nextCursor: null, hasMore: false },
  ])('rejects malformed response %j', (page) => {
    expect(responseSchema.safeParse(page).success).toBe(false)
  })
})

describe('page-number query contract', () => {
  it('defaults to page 1 with a page size of 20', () => {
    expect(pageNumberQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 })
    expectTypeOf<PageNumberQuery>().toEqualTypeOf<{ page: number, pageSize: number }>()
  })

  it.each([1, 2, 10, '1', '2', '10'])('accepts page %j', (page) => {
    expect(pageNumberQuerySchema.parse({ page })).toEqual({ page: Number(page), pageSize: 20 })
  })

  it.each([1, 20, 100, '1', '20', '100'])('accepts pageSize %j', (pageSize) => {
    expect(pageNumberQuerySchema.parse({ pageSize })).toEqual({ page: 1, pageSize: Number(pageSize) })
  })

  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
    '',
    ' ',
    '0',
    '-1',
    '1.5',
    'abc',
    null,
    true,
    [],
    {},
  ].map(page => ({ page })))('rejects invalid page $page', ({ page }) => {
    const result = pageNumberQuerySchema.safeParse({ page })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues[0]?.path).toEqual(['page'])
  })

  it.each([
    0,
    -1,
    101,
    1.5,
    Number.NaN,
    '',
    '0',
    '101',
    'abc',
    null,
    true,
    [],
    {},
  ].map(pageSize => ({ pageSize })))('rejects invalid pageSize $pageSize', ({ pageSize }) => {
    const result = pageNumberQuerySchema.safeParse({ pageSize })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues[0]?.path).toEqual(['pageSize'])
  })

  it('composes with resource-specific filters', () => {
    const querySchema = pageNumberQuerySchema.extend({ status: z.enum(['active', 'archived']) })
    expect(querySchema.parse({ status: 'active' })).toEqual({ status: 'active', page: 1, pageSize: 20 })
  })
})

describe('page-number response contract', () => {
  const itemSchema = z.object({ id: z.string(), name: z.string() })
  const responseSchema = createPageNumberResponseSchema(itemSchema)
  const items = [{ id: '1', name: 'First' }]

  it('infers the item type in the response', () => {
    expectTypeOf<z.infer<typeof responseSchema>>().toEqualTypeOf<{
      items: { id: string, name: string }[]
      total: number
    }>()
    expectTypeOf<PageNumberResponse<z.infer<typeof itemSchema>>>()
      .toEqualTypeOf<z.infer<typeof responseSchema>>()
  })

  it('accepts a page with a total count', () => {
    const page = { items, total: 1 }
    expect(responseSchema.parse(page)).toEqual(page)
  })

  it('accepts an empty page with a zero total', () => {
    const page = { items: [], total: 0 }
    expect(responseSchema.parse(page)).toEqual(page)
  })

  it.each([
    { items },
    { total: 1 },
    { items, total: -1 },
    { items, total: 1.5 },
    { items, total: '1' },
    { items: {}, total: 1 },
    { items: [{ id: 1, name: 'First' }], total: 1 },
  ])('rejects malformed response %j', (page) => {
    expect(responseSchema.safeParse(page).success).toBe(false)
  })
})
