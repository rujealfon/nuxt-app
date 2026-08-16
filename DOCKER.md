# Docker

Full stack: Postgres, API, app, admin, web, and Drizzle Studio.

## Quick start

```bash
cp .env.example .env   # skipped if .env already exists (`predocker:up`)
pnpm docker:up
```

| Service        | URL                          |
| -------------- | ---------------------------- |
| App            | http://localhost:3000        |
| API            | http://localhost:3001        |
| Admin          | http://localhost:3002        |
| Web            | http://localhost:3003        |
| Drizzle Studio | http://127.0.0.1:4983        |
| Postgres       | localhost:5433 (container 5432) |

The API runs Drizzle migrations on boot. Scalar is at http://localhost:3001/ (`NODE_ENV=development`). Seed an admin user:

```bash
pnpm docker:db:seed
```

## Scripts

| Script                | What it does                                      |
| --------------------- | ------------------------------------------------- |
| `pnpm docker:up`      | `compose up -d --wait` (creates `.env` if missing) |
| `pnpm docker:rebuild` | Rebuild images, then up                           |
| `pnpm docker:reset`   | `down -v` then rebuild (wipes the Postgres volume) |
| `pnpm docker:down`    | Stop and remove containers                        |
| `pnpm docker:start` / `stop` / `restart` | Existing containers                  |
| `pnpm docker:db:migrate` | Migrate inside the `api` container              |
| `pnpm docker:db:seed`    | Seed inside the `api` container                 |

## Images

| Service         | Dockerfile                 | Notes                                      |
| --------------- | -------------------------- | ------------------------------------------ |
| `api`           | `apps/api/Dockerfile`      | `tsx` on source; production `runner` stage |
| `drizzle-studio`| `apps/api/Dockerfile`      | `development` target; schema bind-mounted  |
| `app`, `admin`  | `docker/Dockerfile.nuxt`   | Nuxt Node server                           |
| `web`           | `docker/Dockerfile.static` | nginx + prerendered files                  |
| `postgres`      | `postgres:18-alpine`       | Volume `postgres_data`                     |

Inside Compose, apps use `postgres:5432`. The host maps that to **5433** so it does not collide with a local Postgres on 5432.

`docker/postgres-init/` runs on a **new** volume only. It creates `nuxt_app_test` for API tests.

## Host apps + Compose Postgres only

```bash
docker compose up postgres -d
cp .env.example .env
```

Point `DATABASE_URL` at `localhost:5433` (see `.env.example`). Then `pnpm install`, `pnpm db:migrate`, `pnpm dev`.

Local Drizzle Studio (no container): `pnpm db:studio`.
