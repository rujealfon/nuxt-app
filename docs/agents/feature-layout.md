# Feature layout (Nuxt)

Product SPAs (`apps/app`, `apps/admin`) keep domain code in `app/features/<name>/`. `pages/`, `layouts/`, `middleware/`, and `plugins/` stay the Nuxt surface. Auth stays in `layers/auth`. The marketing site (`apps/web`) has no `features/` folder.

## Add a feature

Done when a page under `app/pages/` is a thin adapter, domain files live under `app/features/<name>/`, and no new layer exists unless the table below says so.

1. Create `app/features/<name>/`. Name the folder for the domain (`home`, not `pages` or `ui`).
2. Put private UI in `components/`, UI-facing behavior in `composables/`, Pinia Colada reads in `queries.ts`, writes in `mutations.ts`, client-only Pinia in `stores/` — only the files that feature needs.
3. Keep the route file in `app/pages/`. It sets `definePageMeta` (layout, middleware) and imports the feature.
4. Prefix feature component files with the feature name (`HomeWelcomeCard.vue`) so auto-import names stay unique.

```
app/
├── pages/                      # URL surface — definePageMeta lives here
│   └── index.vue
├── layouts/                    # App shells
├── components/                 # Cross-feature UI (no feature imports)
├── features/
│   └── home/
│       ├── components/         # HomeWelcomeCard.vue
│       ├── composables/        # optional
│       ├── queries.ts          # optional — useQuery + keys
│       ├── mutations.ts        # optional — useMutation + invalidate
│       └── stores/             # optional — client-only Pinia (explicit import)
└── ...
```

Pages import the feature with the app alias (`@app/features/home/...` or `@admin/features/home/...`). Inside a feature, use relative paths. Auto-import also picks up `features/*/components/**` and `features/*/composables`.

Do not add `routes.ts` or a feature `index.ts` unless you need an explicit public API — pages importing the files is enough.

## When a feature should be a layer instead

A layer is for reuse and policy across apps, not for grouping files.

| Kind of feature                            | Where it lives                    |
| ------------------------------------------ | --------------------------------- |
| Auth, route access, Colada defaults        | `layers/auth`                     |
| Tailwind, `UApp`, env loading              | `layers/base`                     |
| Product domain used only by the user app   | `apps/app/app/features/<name>`    |
| Admin-only domain                          | `apps/admin/app/features/<name>`  |
| HTTP client, Zod bodies, public user shape | `packages/auth`, `packages/types` |
| Server domain                              | `apps/api/src/modules/<name>`     |

Promote a feature to a layer when `app` and `admin` must share the same pages, middleware, forms, or Colada defaults. Leave it as a folder when only one SPA owns it.

## Practical rule

Treat Nuxt `pages/`, `layouts/`, `middleware/`, and `plugins/` as the **framework surface**. Treat `features/<name>/` as the **domain surface** (queries, mutations, private components, composables).

Leave `srcDir` as `app/`. Do not register feature routes with a hand-rolled router — Nuxt owns `app/pages/`. Nuxt’s root `shared/` is isomorphic (no Vue); cross-feature UI goes in `app/components/` or a layer.

## Pinia Colada

`@pinia/nuxt` + `@pinia/colada-nuxt` load from `layers/auth`. Global defaults live in `layers/auth/colada.options.ts` (`staleTime: 30_000`). Do not add another Colada plugin or per-feature defaults in `apps/app` or `apps/admin`. Change `colada.options.ts` only when the default should apply to every query in both SPAs.

Session / `AuthUser` stays in `useAuth` (key `['auth', 'me']`). Features do not re-query `/auth/me`. Guards use `ensureUser()` → `refresh()` (honors staleTime). Use `fetchUser()` / `refetch()` when a surface must see the current session immediately.

| Concern                                | Place                                                          |
| -------------------------------------- | -------------------------------------------------------------- |
| Install + 30s `staleTime`              | `layers/auth` (`colada.options.ts`)                            |
| Session / `AuthUser`                   | `useAuth`                                                      |
| Feature reads + keys                   | `app/features/<name>/queries.ts`                               |
| Feature writes + invalidation          | `app/features/<name>/mutations.ts`                             |
| Extra UI state around a query          | `app/features/<name>/composables/`                             |
| Client-only UI state (not server data) | `stores/` — not Colada                                         |
| HTTP + Zod bodies                      | `packages/auth`, `packages/types` (or a future feature client) |

`apps/app` and `apps/admin` are SPAs (`ssr: false`). Colada is the client cache for shared reads, mutations, and invalidation. Use Nuxt `useFetch` / `useAsyncData` only for page-local or SSG work (typically `apps/web`). Pages stay adapters: `definePageMeta`, then `useQuery` / a feature mutation. HTTP does not go in the `.vue` file.

`@pinia/nuxt` auto-scans `app/stores/`, not `features/*/stores`. A feature store is imported like `queries.ts`. Do not put `useQuery()` in a store.

Export a key factory and `defineQueryOptions` from `queries.ts`. Put every value the query function reads into the key (serializable arrays, broad → specific). Call `useQuery` from a page or feature composable:

```ts
export const noteKeys = {
  root: ['notes'] as const,
  list: () => [...noteKeys.root, 'list'] as const,
  detail: (id: string) => [...noteKeys.root, 'detail', id] as const,
}

export const noteListQuery = defineQueryOptions({
  key: noteKeys.list(),
  query: () => notesClient().list(),
})

export const noteDetailQuery = defineQueryOptions((id: string) => ({
  key: noteKeys.detail(id),
  query: () => notesClient().get(id),
}))

const { data } = useQuery(noteListQuery)
const { data: note } = useQuery(() => noteDetailQuery(route.params.id as string))
```

Writes go in `mutations.ts`. `setQueryData` when the response is the full object (login writes `AuthUser` this way). Invalidate a key prefix when lists or related rows may have changed:

```ts
export const useCreateNote = defineMutation(() => {
  const queryCache = useQueryCache()
  return useMutation({
    mutation: (input: CreateNoteInput) => notesClient().create(input),
    onSettled() {
      return queryCache.invalidateQueries({ key: noteKeys.root })
    },
  })
})
```

`defineQuery` / `defineMutation` only when you need colocated computed state (`useAuth` does). Otherwise `defineQueryOptions` + `useQuery` / `useMutation` in setup.

Call defined queries and mutations in setup (page, component, composable) — not at module top level, not later in a click handler without an owner. `refresh()` for normal freshness; `refetch()` to force. Do not park `useQuery()` in a Pinia store (a store keeps the query active forever). A feature does not import another feature’s queries; if you need to invalidate a neighbor, that data is in the wrong feature or it belongs in `layers/auth`.

## Lint

Root ESLint enforces the arrows:

- A feature does not import another feature, `pages/`, or `layouts/`.
- `app/components/` does not import `features/`.
- Inside a feature, relative imports are allowed; everywhere else in the app, use `@app/` / `@admin/` / `@web/`.
