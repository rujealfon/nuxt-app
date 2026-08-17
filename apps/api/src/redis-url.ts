export function isPlainRedisToUpstash(connectionString: string) {
  let url: URL
  try {
    url = new URL(connectionString)
  }
  catch {
    return false
  }

  return url.protocol === 'redis:' && url.hostname.endsWith('.upstash.io')
}
