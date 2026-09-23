# Nuxt 4 and feature organization research

This is research background, checked against Nuxt 4 and Feature-Sliced Design
documentation on 2026-09-17. The feature and service structure described here
is implemented. Use [the architecture guide](../architecture.md) for current
conventions.

## Recommendation

Keep the four Nuxt apps in the pnpm/Turborepo monorepo. Keep route files in
`app/pages/` and put substantial frontend behavior in app-local folders such as
`app/features/billing/`. A feature can contain `ui/`, `model/`, `api/`, and
`lib/` directories when it needs them. Leave small page-specific code in its
page. Extract a feature for meaningful behavior or reuse, not for every
component. Keep `packages/ui` and `packages/client` as shared packages. Add a
shared domain package only when multiple apps need the same contract or logic.

For `apps/api`, keep route handlers thin and put domain logic in
`server/services/<domain>/` and database code in `server/database/`. Keep the
API in one deployable app until deployment or ownership needs justify a split.

## Feature-Sliced Design principles

Feature-Sliced Design groups code by product meaning (a slice), then by
technical purpose (a segment). A slice can depend on lower layers, but not peer
or higher slices. Consumers import its declared interface, not internal files.
Nuxt does not enforce these rules. This repository now uses selective
`index.ts` exports, relative imports within features, and lint rules for module
boundaries. FSD also cautions that auto-imports can bypass public interfaces
and barrels can cause cycles or slow large projects. See its [slice rules](https://fsd.how/docs/reference/slices-segments/)
and [public API guidance](https://fsd.how/docs/reference/public-api/).

The [FSD layer guide](https://fsd.how/docs/reference/layers/) discourages a
generic `widgets/` layer because UI composition and user-flow logic often
overlap. Use pages, features, and shared packages where they clarify ownership.
Add other FSD concepts only when the domain needs them.

## Nuxt conventions

Nuxt 4 recognizes `app/pages/`, `app/components/`, `app/composables/`, and
`app/utils/` for routing and registration. `app/features/` has no framework
behavior unless configured through options such as `imports.dirs`. Recursive
auto-imports can hide business dependencies. This repository disables
auto-imports (`imports.autoImport: false`, `components.dirs: []`) and imports
from feature entrypoints explicitly. See [the architecture guide](../architecture.md)
and [Nuxt's auto-import documentation](https://nuxt.com/docs/4.x/guide/concepts/auto-imports).

Nuxt layers reuse application configuration, components, and composables across
apps. A feature does not need its own layer. Use one when several apps need the
same Nuxt setup. Nuxt modules extend the build or startup process through hooks
and configuration. They are not containers for ordinary business features. See
Nuxt's [layers](https://nuxt.com/docs/4.x/getting-started/layers) and
[modules](https://nuxt.com/docs/4.x/guide/modules) documentation.

Nuxt's `app/pages/` remains the route directory. Pages import features instead
of moving routes to match FSD folder names. See the [FSD Nuxt guide](https://fsd.how/docs/guides/tech/with-nuxtjs/).
