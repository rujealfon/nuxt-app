# Nuxt App Monorepo Starter

A production-ready monorepo for:

| Domain               | App   | Description                 |
| -------------------- | ----- | --------------------------- |
| `nuxt-app.com`       | site  | Public marketing site (SSG) |
| `app.nuxt-app.com`   | app   | Authenticated product (SPA) |
| `admin.nuxt-app.com` | admin | Admin panel (SPA)           |
| `api.nuxt-app.com`   | api   | Hono API + custom auth      |

## Layers

Nuxt apps extend shared layers:

| Layer         | Package                | Used by          | Provides                                         |
| ------------- | ---------------------- | ---------------- | ------------------------------------------------ |
| `layers/base` | `@nuxt-app/layer-base` | app, admin, site | Tailwind, UI components, Nitro/devtools          |
| `layers/auth` | `@nuxt-app/layer-auth` | app, admin       | `useAuth`, `auth` / `guest` / `admin` middleware |

## Stack

- **Monorepo**: pnpm + Turborepo
- **Frontends**: Nuxt 4
- **API**: Hono
- **Auth**: Custom session-based (httpOnly cookies)
- **DB**: PostgreSQL via Drizzle
- **Runtime**: Docker Compose (Postgres + all apps)

## Structure

```
nuxt-app/
├── apps/
│   ├── api/          # Hono backend (port 3001)
│   ├── app/          # User app (port 3000)
│   ├── admin/        # Admin panel (port 3002)
│   └── site/         # Public site (port 3003)
├── layers/
│   ├── base/         # Tailwind, UI components, shared Nuxt config
│   └── auth/         # useAuth, auth/guest/admin middleware
├── packages/
│   ├── auth/         # Shared auth HTTP client
│   ├── db/           # Drizzle schema + client
│   └── types/        # Shared TypeScript types
├── docker/
│   ├── Dockerfile.nuxt
│   └── Dockerfile.static
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Quick Start (Docker)

```bash
cp .env.example .env
pnpm docker:up
```

- App: http://localhost:3000
- API: http://localhost:3001
- Admin: http://localhost:3002
- Site: http://localhost:3003
- Postgres: localhost:5433 (container port 5432)

The API applies Drizzle migrations on boot.

Seed an admin user:

```bash
docker compose exec api pnpm exec tsx src/seed.ts
```

## Lint

[@antfu/eslint-config](https://github.com/antfu/eslint-config) at the repo root (Vue + TypeScript + CSS formatters).

```bash
pnpm lint
pnpm lint:fix
```

## Local development (apps on the host)

Start only Postgres:

```bash
docker compose up postgres -d
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
pnpm dev:site       # http://localhost:3003
```

## Authentication

Custom session-based auth:

- Password hashed with **bcrypt**
- Sessions stored in Postgres
- **httpOnly** cookie (`nuxt_app_session`)
- Cross-subdomain ready (set `COOKIE_DOMAIN=.nuxt-app.com` in production)

### Create first admin user

```bash
pnpm db:seed
```

Or register normally, then promote the user:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

### API Endpoints

| Method | Path               | Description             |
| ------ | ------------------ | ----------------------- |
| POST   | `/auth/register`   | Create account          |
| POST   | `/auth/login`      | Login                   |
| POST   | `/auth/logout`     | Logout                  |
| GET    | `/auth/me`         | Current user            |
| GET    | `/me`              | Protected route example |
| GET    | `/admin/dashboard` | Admin only              |

## Notes

- The API container talks to Postgres at `postgres:5432`. Compose publishes that database on **localhost:5433** so it does not collide with a local Postgres on 5432.
- Cookies work across subdomains when `COOKIE_DOMAIN=.nuxt-app.com`
- For local development, `COOKIE_DOMAIN` can stay `localhost`
