# Nuxt App Monorepo Starter

A production-ready monorepo for:

| Domain               | App   | Description                 |
| -------------------- | ----- | --------------------------- |
| `nuxt-app.com`       | web   | Public marketing site (SSG) |
| `app.nuxt-app.com`   | app   | Authenticated product (SPA) |
| `admin.nuxt-app.com` | admin | Admin panel (SPA)           |
| `api.nuxt-app.com`   | api   | Hono API + custom auth      |

## Layers

Nuxt apps extend shared layers:

| Layer         | Package                | Used by         | Provides                                         |
| ------------- | ---------------------- | --------------- | ------------------------------------------------ |
| `layers/base` | `@nuxt-app/layer-base` | app, admin, web | Tailwind, UI components, Nitro/devtools          |
| `layers/auth` | `@nuxt-app/layer-auth` | app, admin      | `useAuth`, `auth` / `guest` / `admin` middleware |

## Stack

- **Monorepo**: pnpm + Turborepo
- **Frontends**: Nuxt 4
- **API**: Hono
- **Auth**: Custom session-based (httpOnly cookies)
- **DB**: PostgreSQL via Drizzle (Neon in production, `sslmode=verify-full`)
- **Runtime**: Docker Compose (Postgres + Redis + all apps)
- **Rate limit**: `redis` (node-redis) + `hono-rate-limiter` RedisStore (in-memory in tests). Production: [Upstash Redis](https://upstash.com/docs/redis) over `rediss://` (TLS)
- **Jobs**: [Upstash QStash](https://upstash.com/docs/qstash) — background jobs, scheduled/delayed tasks, and a message queue for the serverless API
- **Object storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/) — file/image uploads, S3-compatible, no egress fees
- **Email**: [Resend](https://resend.com/docs) — transactional email (verification, password reset, notifications)

## Structure

```
nuxt-app/
├── apps/
│   ├── api/          # Hono backend (port 3001)
│   ├── app/          # User app (port 3000)
│   ├── admin/        # Admin panel (port 3002)
│   └── web/          # Public marketing site (port 3003)
├── layers/
│   ├── base/         # Tailwind, UI components, shared Nuxt config
│   └── auth/         # useAuth, auth/guest/admin middleware
├── packages/
│   ├── auth/         # Shared auth HTTP client
│   └── types/        # Shared TypeScript types
├── docker/
│   ├── Dockerfile.nuxt
│   └── Dockerfile.static
├── docker-compose.yml
├── DOCKER.md
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Quick start

See [DOCKER.md](./DOCKER.md) for Compose commands, ports, and images.

```bash
cp .env.example .env
pnpm docker:up
```

## Lint

[@antfu/eslint-config](https://github.com/antfu/eslint-config) at the repo root (Vue + TypeScript + CSS formatters).

```bash
pnpm lint
pnpm lint:fix
```

A Husky pre-commit hook runs `lint-staged` (`eslint --fix` on staged files).

## Local development (apps on the host)

Start Postgres and Redis with Compose (see [DOCKER.md](./DOCKER.md)), then:

```bash
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm dev
```

Or individually:

```bash
pnpm dev:api        # http://localhost:3001
pnpm dev:app        # http://localhost:3000
pnpm dev:admin      # http://localhost:3002
pnpm dev:web        # http://localhost:3003
```

## Authentication

Custom session-based auth:

- Password hashed with **bcrypt**
- Sessions stored in Postgres
- **httpOnly** cookie (`nuxt_app_session`)
- Cross-subdomain ready (set `COOKIE_DOMAIN=.nuxt-app.com` in production)

### Create first admin user

```bash
ADMIN_PASSWORD='your-strong-password' pnpm db:seed
```

`ADMIN_PASSWORD` is required. Optional: `ADMIN_EMAIL` (default `admin@nuxt-app.com`) and `ADMIN_NAME`.

Or register normally, then promote the user:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

### API Endpoints

| Method | Path               | Description    |
| ------ | ------------------ | -------------- |
| POST   | `/auth/register`   | Create account |
| POST   | `/auth/login`      | Login          |
| POST   | `/auth/logout`     | Logout         |
| GET    | `/auth/me`         | Current user   |
| GET    | `/admin/dashboard` | Admin only     |

## Notes

- Cookies work across subdomains when `COOKIE_DOMAIN=.nuxt-app.com`
- For local development, `COOKIE_DOMAIN` can stay `localhost`
- Preview `*.vercel.app` hosts are distinct sites: leave `COOKIE_DOMAIN` unset; the app/admin clients use a same-origin `/__api` proxy so the session cookie is first-party
