# Migration

Use this reference for migrations from TanStack Vue Query and between Pinia Colada versions. Treat every migration as a semantic change with tests, not an import-only rewrite.

## Contents

- [Migration workflow](#migration-workflow)
- [TanStack mapping](#tanstack-mapping)
- [Queries and side effects](#queries-and-side-effects)
- [Infinite queries and persistence](#infinite-queries-and-persistence)
- [Compatibility plugin](#compatibility-plugin)
- [Missing utilities](#missing-utilities)
- [Mutation callback semantics](#mutation-callback-semantics)
- [Pinia Colada codemods](#pinia-colada-codemods)
- [Verification matrix](#verification-matrix)

## Migration workflow

1. Inspect manifests, lockfiles, providers, SSR setup, query defaults, plugins, key factories, direct cache operations, tests, and persistence.
2. Inventory each query and mutation: keys, inputs, statuses, callbacks, retries, polling, pagination, optimistic behavior, and consumers.
3. Add Pinia Colada alongside the old implementation when feasible.
4. Establish hierarchical key factories and reusable query options.
5. Migrate ordinary reads, then mutations, infinite queries, SSR, persistence, and global plugins.
6. Run both implementations against the same focused behavior tests.
7. Remove compatibility layers, the old provider, and dependencies only after parity is demonstrated.

## TanStack mapping

| TanStack Vue Query | Pinia Colada | Important difference |
| --- | --- | --- |
| `VueQueryPlugin` / `QueryClient` | Install Pinia, then `PiniaColada` | Preserve request/app boundaries |
| `queryKey` | `key` | Use a getter for reactive segments; do not put refs inside the array |
| `queryFn` | `query` | Ensure HTTP failures reject |
| `mutationFn` | `mutation` | Keep variables explicit |
| `fetchStatus` | `asyncStatus` | `fetching` becomes `loading` |
| `status` | `status` / grouped `state` | Verify pending/error data semantics |
| `refetch({ cancelRefetch: false })` | `refresh()` | Deduplicates and respects freshness |
| `refetch({ throwOnError: true })` | `refetch(true)` | Also verify `refresh(true)` in installed types |
| `select` | `computed()` or transform in `query` | No direct core equivalent |
| `refetchInterval` | Auto-refetch plugin | Configure interval or stale-time policy |
| `retry` / `retryDelay` | Retry plugin | One callback can choose retry and delay |
| `dataUpdatedAt` and related flags | Compatibility/custom plugin or component state | Avoid permanent compatibility without need |
| `queryClient` cache operations | `useQueryCache()` | Translate filters and active/inactive behavior |
| `mutate(vars, callbacks)` | `mutateAsync(vars)` plus promise handling | Component-specific callbacks move to the caller |

The current official migration guide documents a default Pinia Colada `staleTime` of 5 seconds rather than TanStack's 0. Verify all defaults against the installed versions instead of relying on this value indefinitely.

## Queries and side effects

Convert reactive keys:

```ts
// TanStack
useQuery({
  queryKey: ['todos', { page: computed(() => route.query.page) }],
  queryFn: fetchTodos,
})

// Pinia Colada
useQuery({
  key: () => ['todos', { page: route.query.page }],
  query: fetchTodos,
})
```

Classify callbacks rather than translating them mechanically:

- Put global logging, analytics, and generic error reporting in `PiniaColadaQueryHooksPlugin`.
- Put declarative per-query policy in `meta` and consume it globally.
- Put component-instance effects in watchers or component code.
- Use `mutateAsync()` when one call site needs success/error/settled behavior.
- Put data transformation in a `computed()` or the query function.

Pinia Colada stores successful data in shallow refs and replaces values rather than applying TanStack structural sharing. Audit watchers and identity-sensitive memoization.

## Infinite queries and persistence

For infinite queries:

- keep filters in the key but not `pageParam`;
- map `fetchNextPage`/`fetchPreviousPage` to installed load-next/load-previous methods;
- preserve `initialPageParam`, next/previous parameter functions, terminal values, and page direction;
- verify concurrency, cancellation, page trimming, refetch behavior, and return flags from installed types;
- test key changes and both page directions.

For persistence:

- use a new storage namespace during rollout;
- map only deliberately retained queries;
- define schema/identity partitioning and maximum-age policy;
- wait for asynchronous restoration before mount;
- verify serialization for non-JSON types;
- test rollback to the old application with the new cache present.

Do not assume TanStack `buster`, `maxAge`, dehydration filters, or persister contracts have one-to-one equivalents. Implement missing policy at the application storage-envelope level when needed.

## Compatibility plugin

`@pinia/colada-plugin-tanstack-compat` adds common TanStack-style result properties through module augmentation. Current documented query extensions include success/error/fetching/refetching/stale flags, timestamps, and a TanStack-style `fetchStatus`; mutation extensions include idle/pending/success/error flags and timestamps.

Use it to reduce migration breadth or support a temporary shared abstraction. It does not cover every TanStack feature. Record every consumer of compatibility-only properties and remove the plugin after native state usage replaces them.

## Missing utilities

Pinia Colada does not include every TanStack helper. Build small computed utilities from public cache filters when needed:

```ts
export function useIsLoading(filters?: UseQueryEntryFilter) {
  const queryCache = useQueryCache()
  return computed(() =>
    queryCache
      .getEntries(filters)
      .some((entry) => entry.asyncStatus.value === 'loading'),
  )
}
```

Use the mutation cache similarly for `useIsMutating`. Preserve filter semantics and injection context. Do not recreate a broad QueryClient facade unless a staged migration requires it.

For TanStack parity, `useIsFetching()` returns a count rather than a boolean:

```ts
export function useIsFetching(filters?: UseQueryEntryFilter) {
  const queryCache = useQueryCache()
  return computed(() =>
    queryCache
      .getEntries(filters)
      .reduce(
        (count, entry) =>
          count + (entry.asyncStatus.value === 'loading' ? 1 : 0),
        0,
      ),
  )
}
```

Name a boolean `.some()` helper `useIsLoading()` or similar so callers do not mistake it for numeric parity.

This preserves the return shape, not TanStack `QueryFilters` semantics. Inventory every caller's `queryKey`, `exact`, `predicate`, fetch-status, stale, and activity filters; translate only filters supported by the installed `UseQueryEntryFilter`, and implement explicit predicates for the rest. Decide whether retry backoff counts as fetching from observed old behavior and installed plugin state.

## Mutation callback semantics

Translate `mutate(vars, { onSuccess, onError, onSettled })` to caller-owned `mutateAsync()` handling only after auditing semantics:

- TanStack callbacks may depend on component unmount and consecutive-mutation observer behavior.
- Promise callbacks continue unless the application adds an effect-scope or unmount guard.
- Per-call handling does not automatically receive Pinia Colada's `onMutate` context.
- Move consistency-critical behavior into mutation-level hooks; keep optional UI effects at the call site.
- Preserve callback awaiting and error rethrow behavior intentionally.

Test two rapid calls, reverse completion order, caller unmount before settlement, callback rejection, and mutation-level plus caller-level hook ordering.

## Pinia Colada codemods

Pinia Colada ships ast-grep rules inside the installed package. Commit or otherwise preserve the worktree before running a codemod, inspect the installed `codemods/rules` directory, target a narrow source path, and review every change.

Documented rules currently include:

- `migration-0-13-to-0-14.yaml`: moves global query options under `queryOptions`.
- `migration-0-21-to-1-0.yaml`: replaces removed two-parameter `useQuery`/`useQueryState` forms with a single getter.

Example:

```bash
pnpm --package=@ast-grep/cli dlx ast-grep scan \
  -r node_modules/@pinia/colada/codemods/rules/migration-0-21-to-1-0.yaml \
  -i src
```

Never assume this list is current; use rules from the installed target version and follow its migration notes.

## Verification matrix

Verify:

- initial pending, success, initial error, background refresh, and stale-data error UI;
- reactive key changes and disabled-to-enabled transitions;
- deduplication, freshness, forced refetch, cancellation, and garbage collection;
- retry exhaustion and non-retryable errors;
- infinite next/previous boundaries and overlapping load requests;
- cache filter exact/prefix behavior and active/inactive invalidation;
- mutation success, failure, awaited hooks, optimistic rollback, and overlap order;
- persisted cold start, corrupt/expired/wrong-user data, and async restore;
- SSR request isolation and hydration without duplicate fetching;
- query side effects firing at the intended cache or component scope;
- removal of all old provider, compatibility, and dependency references.

Official topics: [TanStack migration](https://pinia-colada.esm.dev/cookbook/migration-tvq.html), [Compatibility plugin](https://pinia-colada.esm.dev/cookbook/tanstack-compat.html), and [Migration codemods](https://pinia-colada.esm.dev/cookbook/migrations.html).
