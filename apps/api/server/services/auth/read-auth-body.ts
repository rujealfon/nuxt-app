import type { H3Event } from 'h3'
import { setResponseHeader } from 'h3'
import { domainFailure } from '#server/utils/domain-failure'

export const authBodyLimit = 16 * 1024
const rawBodySymbol = Symbol.for('h3RawBody')

// Stop accepting an unread upload without destroying the socket before the
// API error response has been sent. No unbounded drain or H3 stream is started.
export function closeAuthUpload(event: H3Event) {
  const { req, res } = event.node
  req.pause()
  setResponseHeader(event, 'connection', 'close')
  const destroy = () => req.destroy()
  res.once('finish', destroy)
  res.once('close', destroy)
}

function tooLarge(event: H3Event) {
  closeAuthUpload(event)
  return domainFailure('invalid_input', 'The authentication request body is too large')
}

async function readWebBody(event: H3Event, stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        return Buffer.concat(chunks, size)
      }
      size += value.byteLength
      if (size > authBodyLimit) {
        // Cancellation can wait for the peer; rejection must not wait for it.
        void reader.cancel().catch(() => {})
        throw tooLarge(event)
      }
      chunks.push(value)
    }
  }
  finally {
    reader.releaseLock()
  }
}

// Read before toWebRequest: H3's Node stream adapter starts flowing immediately
// and has neither backpressure nor cancellation cleanup. Only accepted, bounded
// bytes are replayed to Better Auth and inspected for field errors.
export async function readAuthBody(event: H3Event): Promise<Uint8Array> {
  const length = event.headers.get('content-length')
  if (length && Number(length) > authBodyLimit) {
    throw tooLarge(event)
  }

  // Web runtimes use a synthetic Node request whose stream may never end.
  // A native Request with no body is already the authoritative empty upload.
  if (event.web?.request && !event.web.request.body) {
    return new Uint8Array()
  }

  const req = event.node.req as typeof event.node.req & {
    [rawBodySymbol]?: unknown
    rawBody?: unknown
    body?: unknown
  }
  const cached = event.web?.request?.body ?? event._requestBody
    ?? req[rawBodySymbol] ?? req.rawBody ?? req.body
  if (cached !== undefined && cached !== null) {
    let body = await cached
    // Preserve H3's platform-provided, already-parsed JSON representation.
    if (body && body.constructor === Object) {
      body = JSON.stringify(body)
    }
    const size = typeof body === 'string'
      ? Buffer.byteLength(body)
      : body instanceof ArrayBuffer || ArrayBuffer.isView(body)
        ? body.byteLength
        : body instanceof Blob ? body.size : 0
    if (size > authBodyLimit) {
      throw tooLarge(event)
    }
    const stream = new Response(body as BodyInit).body
    return stream ? readWebBody(event, stream) : new Uint8Array()
  }

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    let size = 0
    function cleanup() {
      req.off('data', data)
      req.off('end', end)
      req.off('error', error)
      req.off('aborted', aborted)
    }
    function error(cause: Error) {
      cleanup()
      reject(cause)
    }
    function aborted() {
      error(domainFailure('invalid_input', 'The authentication request was aborted'))
    }
    function end() {
      cleanup()
      resolve(Buffer.concat(chunks, size))
    }
    function data(chunk: Uint8Array) {
      size += chunk.byteLength
      if (size > authBodyLimit) {
        cleanup()
        reject(tooLarge(event))
        return
      }
      chunks.push(chunk)
    }
    if (req.destroyed) {
      aborted()
      return
    }
    if (req.readableEnded) {
      end()
      return
    }
    req.on('error', error)
    req.on('aborted', aborted)
    req.on('end', end)
    req.on('data', data)
  })
}
