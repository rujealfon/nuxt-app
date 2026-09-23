# Cross-feature composition

A feature should own one user capability and expose selected exports through its `index.ts`. When feature A appears to need feature B, check what the dependency represents.

- If both parts form one capability and change together, keep them in one feature.
- If a route coordinates independent capabilities, import both public entrypoints in its page and pass data through props and events.
- If several routes coordinate the same capabilities, put that coordination in an app-level workflow with the features as dependencies.
- If both features need the same client state, define a Pinia store at the nearest suitable owner. Use a shared package only when more than one app consumes it.
- If both features need the same server data, use Pinia Colada's query cache and shared contracts. Keep each feature's query and mutation operations with its owner; move foundational HTTP code to `packages/client`.
- If several apps need the same UI or contract, use `packages/ui` or `packages/types` as appropriate.

Keep feature internals private. An `index.ts` export does not make a peer feature import acceptable in this repository. Check `eslint.architecture.mjs` and `pnpm lint` when moving code across boundaries.
