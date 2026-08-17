# Connecting to Postgres

Pick the driver that matches how the target actually runs — TCP-capable server vs. serverless/edge with no persistent TCP socket — rather than defaulting to whichever is most familiar. If a driver is already installed in the project, use that one.

## Don't exhaust `max_connections` in serverless/edge deployments

Postgres has a hard cap on concurrent connections (`max_connections`, often in the low hundreds). A long-running server opens one pool at startup and reuses it for the process lifetime, which is fine. A serverless function is different: if each invocation (or each cold start) creates a *new* `Pool`/`postgres()` client instead of reusing one, concurrent invocations under load can open far more connections than Postgres allows, and requests start failing with connection errors — this is one of the most common production incidents in serverless-Postgres setups, not a theoretical concern.

Two ways to avoid it:

1. **Reuse a module-level client.** Create the `Pool`/`postgres()` client once at module scope (outside the request handler) so warm invocations reuse it; only cold starts open a new connection. Pair with a small pool size (e.g. `max: 1`–`5` per function instance) since many function instances can run concurrently.
2. **Use an HTTP-based driver** that doesn't hold a persistent TCP connection at all — Neon's `neon-http` driver or `@vercel/postgres` issue each query as its own HTTP request, sidestepping the connection-limit problem entirely (at the cost of not supporting interactive `db.transaction()`; see the Neon section below). Prefer this for edge runtimes or Lambda functions with many concurrent instances, and fall back to a pooled TCP driver only when the workload needs real transactions.

If the target is a traditional long-running server or container, this isn't a concern — a single `Pool` created at startup and reused for the process lifetime is correct as shown below.

## node-postgres (`pg`) — traditional server/container deployments

```bash
npm i drizzle-orm pg
npm i -D drizzle-kit @types/pg
```

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(process.env.DATABASE_URL!);
```

With an existing `Pool` (needed for custom pool sizing, SSL config, etc.):

```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
const db = drizzle({ client: pool });
```

## postgres.js — traditional server/container deployments, alternative driver

```bash
npm i drizzle-orm postgres
npm i -D drizzle-kit
```

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';

const db = drizzle(process.env.DATABASE_URL!);
```

postgres.js uses prepared statements by default. Behind a connection pooler running in transaction-pool mode (see Supabase below), disable them:

```typescript
import postgres from 'postgres';
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle({ client });
```

## Neon — serverless Postgres

```bash
npm i drizzle-orm @neondatabase/serverless
npm i -D drizzle-kit
```

Two drivers depending on workload:

```typescript
// neon-http: single isolated queries, works in edge runtimes without TCP/WebSocket
import { drizzle } from 'drizzle-orm/neon-http';
const db = drizzle(process.env.DATABASE_URL!);
```

```typescript
// neon-serverless: WebSocket-based pool, needed for interactive transactions / db.transaction()
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });
```

`neon-http` cannot run multi-statement interactive transactions (each call is its own HTTP request) — reach for `neon-serverless` if the code needs `db.transaction()`. In a traditional long-running server talking to Neon, plain `pg`/`postgres.js` also work over Neon's regular TCP endpoint.

## Supabase

Supabase is plain Postgres underneath, so any driver works, but its pooler mode matters:

```bash
npm i drizzle-orm postgres
npm i -D drizzle-kit
```

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
const db = drizzle(process.env.DATABASE_URL!);
```

- **Direct connection** — for long-running servers.
- **Connection pooler, transaction mode** — for serverless; requires `postgres(url, { prepare: false })` since prepared statements aren't supported in that mode.
- Supabase-specific RLS helpers (`authenticatedRole`, `authUsers`, `authUid()`) live in `drizzle-orm/supabase` — see [postgres-advanced.md](postgres-advanced.md).

## Vercel Postgres

```bash
npm i drizzle-orm @vercel/postgres
npm i -D drizzle-kit
```

```typescript
import { drizzle } from 'drizzle-orm/vercel-postgres';
const db = drizzle(); // reads POSTGRES_URL from env automatically
```

Built on `@vercel/postgres`'s serverless (WebSocket-based) driver — suitable for edge/serverless functions without TCP access.

## PGlite — embedded/in-memory Postgres (tests, local-first apps)

```bash
npm i drizzle-orm @electric-sql/pglite
npm i -D drizzle-kit
```

```typescript
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

const client = new PGlite(); // or new PGlite('./local.db') for on-disk
const db = drizzle({ client });
```

Runs Postgres compiled to WASM with no separate server process — useful for unit/integration tests that want real Postgres semantics without a Docker container, or local-first apps.

## Other providers (same shape, different package)

Xata, Nile, Netlify DB, and AWS Data API for Postgres each ship a `drizzle-orm/<provider>` entry point following the same `drizzle(...)`/`drizzle({ client })` pattern as above — install the provider's official client package plus `drizzle-orm`, then check that provider's page in the [official docs](https://orm.drizzle.team/docs/overview) for the exact import path and any provider-specific connection quirks (e.g. AWS Data API needs a `resourceArn`/`secretArn` instead of a connection string).

## `db.execute` for anything outside the query builder

Every driver's `db` exposes `db.execute(sql\`...\`)` (or a plain string) for raw SQL that doesn't fit the builder — useful for one-off diagnostics or Postgres features not yet modeled by Drizzle.
