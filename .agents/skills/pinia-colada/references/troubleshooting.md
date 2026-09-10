# Troubleshooting

Use this reference when Pinia Colada emits a diagnostic code or async state behaves unexpectedly. Capture the exact code, stack, installed versions, relevant key/options, and reproduction before changing cache behavior.

## Diagnostic map

| Code | Meaning | First check |
| --- | --- | --- |
| `PINIA_COLADA_C0001` | Root Pinia plugin not detected | Install Pinia before Pinia Colada, or pass the intended Pinia instance explicitly |
| `PINIA_COLADA_R0001` | Cache composable called outside injection context | Resolve it synchronously in setup/store/guard, or pass Pinia explicitly |
| `PINIA_COLADA_R0002` | Query or mutation cache directly replaced | Use public cache methods; never assign the internal cache |
| `PINIA_COLADA_R0003` | Query key is empty | Return a non-empty key and use `enabled` while required input is absent |
| `PINIA_COLADA_R0004` | Fetch/refresh attempted on an entry without query options | Fetch only entries initialized by `useQuery` or ensured with options |
| `PINIA_COLADA_R0005` | Mutation entry used before it was ensured | Use `useMutation`, or ensure a manually created entry before mutating |
| `PINIA_COLADA_R0006` | Mutation entry reused | Ensure a fresh entry for every invocation |
| `PINIA_COLADA_R0007` | Defined mutation called outside an effect scope | Call it from setup, a store, or an explicit effect scope |
| `PINIA_COLADA_R0008` | Previous infinite page requested without `getPreviousPageParam` | Define the callback or remove backward pagination |
| `PINIA_COLADA_R0009` | Infinite-query entry not found | Ensure the query is active and the key has not changed or been collected |

Verify the installed version's official error page if a code is absent or its behavior differs.

## Injection context

Call `useQueryCache()` and `useMutationCache()` synchronously where Vue injection is available. Do not first call them inside a later timer, watcher callback, or event handler:

```ts
export default defineNuxtPlugin(() => {
  const queryCache = useQueryCache()

  watch(authUser, () => {
    queryCache.invalidateQueries({ key: ['session'] })
  })
})
```

Outside an app context, pass the correct Pinia instance explicitly:

```ts
const queryCache = useQueryCache(pinia)
```

Check for multiple Vue apps or Pinia instances when the cache appears empty or updates the wrong tree.

## Unexpected requests or stale data

Check, in order:

1. Every reactive input read by `query` is represented in the key.
2. Key segments retain stable primitive types and serializable values.
3. `enabled` does not unintentionally keep the query active or disabled.
4. `staleTime` and `gcTime` match the intended behavior.
5. A store or reusable query is not keeping an entry active forever.
6. Invalidation uses the intended prefix and `exact` setting.
7. A mutation awaits invalidation only when its loading state should cover the refetch.
8. An optimistic update cancels obsolete in-flight work and protects against concurrent rollback.
9. SSR hydration restores the same key shape used on the client.
10. Persisted cache data is not stale across a schema, deployment, tenant, or user change.

## Error state never appears

`fetch()` resolves for HTTP error status codes. Check `response.ok` and throw an error, or deliberately return a typed response union and render it as data. Also check whether a retry plugin delays the final error.

Use `state.status` rather than independent refs when TypeScript narrowing matters. Distinguish an initial pending state from a background request via `asyncStatus`.

## Cache repair

Avoid broad cache resets. Prefer:

- exact `setQueryData()` for one authoritative value;
- prefix invalidation for related resources;
- cancellation followed by removal only for deliberate eviction;
- versioned persistence cleanup for incompatible stored data.

Removing an active entry usually causes immediate recreation. Removing does not necessarily abort in-flight work, so cancel it first.

## SSR failures

- Never share a request-scoped Pinia or query cache across requests.
- Install Pinia and Pinia Colada before hydration.
- Serialize and revive the query-cache tree with supported helpers.
- Disable server GC timers and clear the cache after each custom render.
- Configure custom error serialization when errors cross the SSR payload.
- In Nuxt, prefer the official module unless the project has a deliberate custom integration.

Official topic: [Errors and warnings](https://pinia-colada.esm.dev/errors.html).
