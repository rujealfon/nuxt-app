# Module layout (API)

The Hono app (`apps/api`) keeps domain code in `src/modules/<name>/`. `app.ts`, `factory.ts`, `middleware/`, and `request-policy.ts` stay the framework surface. Drizzle tables stay in `src/db/`. `auth` is the module to copy.

## Add a module

Done when `src/app.ts` mounts a chained router from `src/modules/<name>/routes.ts`, handlers stay inline on `.openapi()`, domain logic lives beside `routes.ts` only if HTTP is not enough, and no new package exists unless the table below says so.

1. Create `src/modules/<name>/`. Name the folder for the resource (`auth`, not `controllers` or `api`).
2. Add `routes.ts`: `createRoute` + `createRouter().openapi()` chained, handlers inline. Call domain functions; keep user PKs out of the handler.
3. Add domain files only when the work is not mapping HTTP → status (`identity.ts` / `session.ts` in auth; one `service.ts` is enough for a smaller module).
4. Mount in `src/app.ts` with `.route('/<prefix>', nameRoutes)` on the existing chain. Add a tag in `src/modules/docs/routes.ts` when the OpenAPI tag is new.

```
apps/api/src/
├── index.ts                 # process boot
├── app.ts                   # global middleware + .route() mounts
├── factory.ts               # createFactory<AppEnv> + OpenAPIHono
├── middleware/              # session, requireAdmin, rate-limit, error
├── db/                      # schema, client, migrate
└── modules/
    ├── health/              # routes.ts only
    ├── docs/                # Scalar + /openapi.json
    ├── admin/               # /admin prefix, not a domain
    └── auth/                # copy this split
        ├── routes.ts        # HTTP + OpenAPI
        ├── identity.ts      # users + passwords + signIn
        └── session.ts       # cookie + row + AuthUser mapping
```

Imports use `#api/` even inside a module (same as the rest of the API). Tests stay in `apps/api/test/` and call `app.request()`.

`health` and `docs` stay route-only. `admin` is a mount prefix. A new admin-only resource is its own module, mounted under `/admin` or its own prefix.

## When a module should be a package instead

A package is for another workspace to import. A module is for HTTP + server domain.

| Kind of thing                              | Where it lives                         |
| ------------------------------------------ | -------------------------------------- |
| HTTP + OpenAPI for one capability          | `src/modules/<name>/`                  |
| Cross-cutting request policy               | `src/middleware/`, `request-policy.ts` |
| Tables, migrations                         | `src/db/schema/`                       |
| Zod bodies / `AuthUser` used by Nuxt forms | `packages/types`                       |
| Fetch client for SPAs                      | `packages/auth` (or `packages/<name>`) |
| Shared UI / Colada / route guards          | `layers/auth`                          |

Promote to a package when `apps/app`, `apps/admin`, or a layer must import the type or client. Leave it in the module when only the API uses it.

## Practical rule

Treat `app.ts`, `factory.ts`, `middleware/`, and `request-policy.ts` as the **framework surface**. Treat `modules/<name>/` as the **domain surface**.

`routes.ts` is the HTTP adapter (same job as a Nuxt `pages/*.vue`). Build routers with `createRouter()` from `factory.ts`. Chain `.openapi()` in the module and `.route()` in `app.ts`. Handlers stay next to the path so `c.req.valid(...)` stays typed.

SPAs talk to the API through `@nuxt-app/auth` and `@nuxt-app/types`. Extra `routes-*.ts` files are fine when `routes.ts` is hard to scan — still export one chained router.

| Nuxt                             | API                                         |
| -------------------------------- | ------------------------------------------- |
| `app/pages/`                     | `modules/<name>/routes.ts`                  |
| `app/features/<name>/queries.ts` | `identity.ts` / `session.ts` / `service.ts` |
| `layers/auth`                    | already the session policy — reuse it       |
| `packages/types`                 | shared request/response Zod                 |
