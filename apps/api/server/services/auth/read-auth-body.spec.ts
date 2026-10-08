import { EventEmitter, once } from 'node:events'
import { PassThrough } from 'node:stream'
import { createEvent } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { authBodyLimit, readAuthBody } from './read-auth-body'

vi.mock('h3', async () => {
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  return import(require.resolve('h3', { paths: [require.resolve('nuxt/package.json')] }))
})

function fixture(headers: Record<string, string> = {}, stream = new PassThrough()) {
  const req = Object.assign(stream, { method: 'POST', url: '/api/auth/sign-in/email', headers })
  const res = Object.assign(new EventEmitter(), { setHeader: vi.fn() })
  const event = createEvent(req as never, res as never)
  return { req, res, event }
}

describe('bounded auth body reading', () => {
  it('returns an empty body for a bodyless native Web Request '
    + 'without reading the Node shim', async () => {
    const { event, req } = fixture()
    event.web = { request: new Request('http://localhost/api/auth/sign-out', { method: 'POST' }) }
    await expect(readAuthBody(event)).resolves.toEqual(new Uint8Array())
    expect(req.listenerCount('data')).toBe(0)
  })

  it('preserves H3 object-backed JSON bodies', async () => {
    const { event, req } = fixture({ 'content-type': 'application/json' })
    const body = { email: 'user@example.com', password: 'password123' }
    Object.assign(req, { body })
    expect(new TextDecoder().decode(await readAuthBody(event))).toBe(JSON.stringify(body))
  })

  it('returns an empty resolved cached body without starting the Node stream', async () => {
    const { event, req } = fixture()
    Object.assign(event, { _requestBody: Promise.resolve(undefined) })
    await expect(readAuthBody(event)).resolves.toEqual(new Uint8Array())
    expect(req.listenerCount('data')).toBe(0)
  })

  it('rejects an oversized cached Blob before reading its bytes', async () => {
    const { event, req, res } = fixture()
    const body = new Blob([new Uint8Array(authBodyLimit + 1)])
    const stream = vi.spyOn(body, 'stream')
    event._requestBody = body
    await expect(readAuthBody(event)).rejects.toMatchObject({ error: 'invalid_input' })
    expect(stream).not.toHaveBeenCalled()
    expect(req.listenerCount('data')).toBe(0)
    res.emit('close')
    expect(req.destroyed).toBe(true)
  })

  it('replays exactly the accepted byte limit '
    + 'without trusting a small Content-Length', async () => {
    const { event } = fixture({ 'content-length': '1' })
    const bytes = Buffer.alloc(authBodyLimit, 'x')
    event._requestBody = bytes
    expect(await readAuthBody(event)).toEqual(bytes)
  })

  it('rejects actual cached bytes over the limit even with a small Content-Length', async () => {
    const { event } = fixture({ 'content-length': '1' })
    event._requestBody = Buffer.alloc(authBodyLimit + 1)
    await expect(readAuthBody(event)).rejects.toMatchObject({ error: 'invalid_input' })
  })

  it('rejects a declared overflow without starting the Node body stream', async () => {
    const { event, req, res } = fixture({ 'content-length': String(authBodyLimit + 1) })
    await expect(readAuthBody(event)).rejects.toMatchObject({ error: 'invalid_input' })
    expect(req.listenerCount('data')).toBe(0)
    expect(res.setHeader).toHaveBeenCalledWith('connection', 'close')
    res.emit('finish')
    expect(req.destroyed).toBe(true)
  })

  it('bounds a lengthless web-runtime stream '
    + 'and cancels it without waiting for completion', async () => {
    const { event } = fixture()
    const cancel = vi.fn(() => new Promise<void>(() => {}))
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(authBodyLimit))
        controller.enqueue(new Uint8Array(1))
      },
      cancel,
    })
    event.web = { request: new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit) }
    await expect(readAuthBody(event)).rejects.toMatchObject({ error: 'invalid_input' })
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('preserves the overflow failure when cancelling the Web upload rejects', async () => {
    const { event } = fixture()
    const cancel = vi.fn(async () => {
      throw new Error('Cancellation failed')
    })
    event.web = { request: new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(authBodyLimit + 1))
        },
        cancel,
      }),
      duplex: 'half',
    } as RequestInit) }
    await expect(readAuthBody(event)).rejects.toMatchObject({ error: 'invalid_input' })
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('rejects an already destroyed Node upload without installing listeners', async () => {
    const { event, req } = fixture()
    req.destroy()
    await expect(readAuthBody(event)).rejects.toMatchObject({ error: 'invalid_input' })
    expect(req.listenerCount('data')).toBe(0)
    expect(req.listenerCount('end')).toBe(0)
  })

  it('returns an empty body for an already ended Node stream '
    + 'without waiting for another end', async () => {
    const { event, req } = fixture({}, new PassThrough({ autoDestroy: false }))
    const ended = once(req, 'end')
    req.resume()
    req.end()
    await ended
    await expect(readAuthBody(event)).resolves.toEqual(Buffer.alloc(0))
    expect(req.listenerCount('data')).toBe(0)
    expect(req.listenerCount('end')).toBe(0)
  })

  it('cleans up an aborted Node upload instead of retaining its buffered body', async () => {
    const { event, req } = fixture()
    const reading = readAuthBody(event)
    req.write('partial')
    req.emit('aborted')
    await expect(reading).rejects.toMatchObject({ error: 'invalid_input' })
    expect(req.listenerCount('data')).toBe(0)
    expect(req.listenerCount('end')).toBe(0)
  })
})
