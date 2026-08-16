# MySite Monorepo Starter

A production-ready monorepo for:

| Domain              | App          | Description                    |
|---------------------|--------------|--------------------------------|
| `mysite.com`        | site    | Public site / landing     |
| `app.mysite.com`    | app          | Authenticated user dashboard   |
| `admin.mysite.com`  | admin        | Admin panel (role: admin)      |
| `api.mysite.com`    | api          | Hono API + custom auth         |

## Stack

- **Monorepo**: pnpm + Turborepo
- **Frontends**: Nuxt 4
- **API**: Hono
- **Auth**: Custom session-based (httpOnly cookies + SQLite)
- **DB**: SQLite (local) → easy to switch to Postgres later

## Structure

```
mysite-monorepo/
├── apps/
│   ├── api/          # Hono backend (port 3001)
│   ├── app/          # User app (port 3000)
│   ├── admin/        # Admin panel (port 3002)
│   └── site/    # site site (port 3003)
├── packages/
│   ├── auth/         # Shared auth client
│   └── types/        # Shared TypeScript types
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Setup environment

```bash
cp .env.example .env
# Edit .env if needed
```

### 3. Run database migrations

```bash
cd apps/api
pnpm db:migrate
```

### 4. Start everything

From the root:

```bash
pnpm dev
```

Or individually:

```bash
pnpm dev:api        # http://localhost:3001
pnpm dev:app        # http://localhost:3000
pnpm dev:admin      # http://localhost:3002
pnpm dev:site  # http://localhost:3003
```

## Authentication

Custom session-based auth:

- Password hashed with **bcrypt**
- Sessions stored in DB
- **httpOnly** cookie (`mysite_session`)
- Cross-subdomain ready (set `COOKIE_DOMAIN=.mysite.com` in production)

### Create first admin user

You can register normally, then promote the user in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Or use the register endpoint and update role.

### API Endpoints

| Method | Path            | Description              |
|--------|-----------------|--------------------------|
| POST   | `/auth/register`| Create account           |
| POST   | `/auth/login`   | Login                    |
| POST   | `/auth/logout`  | Logout                   |
| GET    | `/auth/me`      | Current user             |
| GET    | `/me`           | Protected route example  |
| GET    | `/admin/dashboard` | Admin only            |

## Production (Vercel)

1. Create **4 Vercel projects** from the same repo
2. Set **Root Directory** for each:
   - `apps/api`
   - `apps/app`
   - `apps/admin`
   - `apps/site`
3. Add domains:
   - `api.mysite.com` → api project
   - `app.mysite.com` → app project
   - `admin.mysite.com` → admin project
   - `mysite.com` → site project
4. Set environment variables (especially `COOKIE_DOMAIN=.mysite.com` and `DATABASE_URL`)

## Notes

- Cookies work across subdomains when `COOKIE_DOMAIN=.mysite.com`
- For local development, `COOKIE_DOMAIN` can stay empty / `localhost`
- Switch to Postgres by changing the Drizzle driver and connection string
