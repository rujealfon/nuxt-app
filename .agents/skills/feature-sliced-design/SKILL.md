---
name: feature-sliced-design
description: Use for frontend code placement, feature boundaries, public exports, asset placement, or deciding when to extract shared code in this Nuxt monorepo.
---

# Feature-Sliced Design in this repository

This skill adapts [feature-sliced/skills at fd71da4](https://github.com/feature-sliced/skills/tree/fd71da42a89e916f2ced63e5349fd865c87070a6/feature-sliced-design) to this Nuxt 4 monorepo. Read [the architecture guide](../../../docs/architecture.md) and the affected app's `AGENTS.md` before changing its structure. The guide defines this repository's paths and import rules.

## Decide who owns the code

1. Keep route files and small, route-specific behavior in `apps/{web,app,admin}/app/pages/`. Put substantial screen behavior in `app/features/<feature>/`, even when one route uses it. Pages compose features and hold route metadata.
2. Keep feature files together. Add `ui/`, `model/`, `api/`, or `lib/` only when the code needs those segments. Put Vue components in `ui/`, feature state and composables in `model/`, remote-data operations in `api/`, and pure helpers in `lib/`.
3. Put app-wide setup in that app's `app/` root. Put code used by multiple apps in `packages/` when it has a clear owner and actual consumers. Use `packages/ui` for shared components, `packages/client` for auth and HTTP foundations, and `packages/types` for shared contracts.
4. Keep a business model inside its feature until several independent features need the same domain rules. Decide whether a shared package or an app-level model owns that code before adding another FSD layer. This repository does not currently use an `entities/` layer.

## Preserve boundaries

- Export the feature's selected public interface from `index.ts`. Import that entrypoint from pages and other external consumers. Use relative imports inside the feature.
- Keep peer features independent. Compose them in a page or app-level workflow. Read [cross-feature composition](references/cross-imports.md) when one feature appears to need another.
- Share code across apps through `packages/`. Keep packages independent of app implementation files. Frontend code reaches the API through HTTP and shared contracts.
- Keep API handlers and domain services in `apps/api` according to [backend patterns](../../../docs/backend-patterns.md). This frontend placement skill does not change server ownership.

## Use the existing frontend stack

- Write Vue components with Composition API and `<script setup lang="ts">`. Apply [vue-best-practices](../vue-best-practices/SKILL.md) and [nuxt](../nuxt/SKILL.md) for implementation details. Auto-imports are disabled, so import Vue APIs, composables, and components explicitly.
- Keep temporary form, dialog, and view state in Vue `ref` or `computed`. Use [VueUse](../vueuse-functions/SKILL.md) for a suitable browser or reactive utility.
- Use [Pinia](../pinia/SKILL.md) for client state shared across screens. Use [Pinia Colada](../pinia-colada/SKILL.md) for server data, queries, mutations, and cache updates. Place operations near the owning feature; move foundations with real cross-app consumers to `packages/client`.
- Use the existing Better Auth client, `useAuth`, `useAuthForm`, and `useApi` from `packages/client` for auth and HTTP. Keep shared request and response contracts in `packages/types`.
- Use [Nuxt UI](../nuxt-ui/SKILL.md) for interface implementation and `packages/ui` for components shared across apps.

Read [asset placement](references/asset-handling.md) when adding images, icons, fonts, or downloadable files.

## Check the result

Run `pnpm lint` for ESLint import boundaries and Steiger's frontend feature structure checks. Use `pnpm lint:structure` to run Steiger alone. `pnpm lint:fix` fixes ESLint findings only. Follow the affected app's `AGENTS.md` and the root testing instructions for code changes.
