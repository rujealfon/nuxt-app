# Changelog

Versions here track this skill's own content (instructions and references), not the `@pinia/colada` package version. See the [README](README.md#version) for which line this skill was last verified against.

## 1.0.3 - 2026-10-07

Re-verified against `@pinia/colada` 1.4.7 and https://pinia-colada.esm.dev/llms.txt.

- `PINIA_COLADA_R0010` (1.4.7): removing an active query entry is unsupported. Invalidate instead of `queryCache.remove()` while a consumer is still mounted.
- Query-hooks `onError` runs for a failed fetch. A cancelled fetch skips it (1.4.6).
- Auto-refetch `true` schedules from a finite `staleTime`. `Infinity` does not schedule (`@pinia/colada-plugin-auto-refetch` 0.2.7).

`defineQuery` key-tracking and garbage-collection fixes in 1.4.6–1.4.7 do not change the instructions.

## 1.0.2 - 2026-09-21

Re-verified against `@pinia/colada` 1.4.5 and https://pinia-colada.esm.dev/llms.txt. The 1.4.3-1.4.5 range is bug fixes only (stale-entry serialization/hydration, `queryStore.get` entry typing, initial-mutation variables), so no skill content changed. This release is a metadata refresh.

## 1.0.1 - 2026-08-23

Docs-backed refresh against `@pinia/colada` 1.4.2 and https://pinia-colada.esm.dev/llms.txt.

- Name query-context `signal: AbortSignal` and distinguish cancellation from invalidation.
- Record that refetch failure keeps previous `data`; `mutate()` swallows, `mutateAsync()` rethrows.
- Core `refetchOnWindowFocus` / `refetchOnReconnect` / `refetchOnMount` (auto-refetch plugin is interval-only); SSR-only `PiniaColadaSSRNoGc`.
- Sharpen SKILL.md implement rules; add `/pinia-colada` trigger.

Won't add: community plugin directory; a seventh "error handling" reference (the pieces live in queries, plugins, and troubleshooting).

## 1.0.0 - 2026-08-22

Initial versioned release. Covers queries, cache and mutations, Vue/Nuxt integrations, plugins and persistence, TanStack Vue Query migration, and troubleshooting. Verified against `@pinia/colada` 1.4.2.
