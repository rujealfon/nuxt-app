import { Client } from 'pg'

function quoteIdent(name: string) {
  return `"${name.replaceAll('"', '""')}"`
}

export async function ensureDatabase(connectionString: string) {
  const url = new URL(connectionString)
  const name = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!name)
    throw new Error('DATABASE_URL is missing a database name')

  const admin = new URL(connectionString)
  admin.pathname = '/postgres'

  const client = new Client({ connectionString: admin.toString() })
  await client.connect()
  try {
    const { rows } = await client.query<{ exists: number }>(
      'SELECT 1 AS exists FROM pg_database WHERE datname = $1',
      [name],
    )
    if (!rows.length)
      await client.query(`CREATE DATABASE ${quoteIdent(name)}`)
  }
  finally {
    await client.end()
  }
}
