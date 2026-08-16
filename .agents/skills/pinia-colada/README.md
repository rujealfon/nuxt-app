# Pinia Colada Skill

Build, review, migrate, test, and troubleshoot asynchronous data workflows
with Pinia Colada in Vue and Nuxt applications.

## Installation

Install the skill with:

```bash
npx skills add rujealfon/skills --skill pinia-colada
```

Then ask your agent:

```text
Use $pinia-colada to implement and verify async data fetching in this Vue application.
```

## Coverage

The skill provides focused guidance for:

- Installation and Vue application setup
- Nuxt and custom SSR integration
- Queries, query keys, metadata, pagination, and infinite queries
- Mutations, invalidation, prefetching, and optimistic updates
- Cache consistency and concurrent mutation policies
- Official plugins and custom plugin authoring
- Cache persistence, serialization, expiry, and identity isolation
- Testing and troubleshooting
- TanStack Vue Query migrations, compatibility helpers, and codemods

The target project's installed Pinia Colada declarations and source remain the
authority for version-specific APIs. The skill directs agents to consult the
official documentation when installed code does not answer a current behavior
question.

## Contents

- [SKILL.md](SKILL.md) contains the core agent workflow.
- [references/queries.md](references/queries.md) covers query design and state.
- [references/cache-and-mutations.md](references/cache-and-mutations.md) covers cache consistency and writes.
- [references/integrations.md](references/integrations.md) covers Vue, Nuxt, SSR, and testing.
- [references/plugins-and-persistence.md](references/plugins-and-persistence.md) covers plugins and persistent caches.
- [references/migration.md](references/migration.md) covers migrations and compatibility.
- [references/troubleshooting.md](references/troubleshooting.md) covers diagnostics and runtime errors.

## License

Repository content is available under the root [MIT License](../../LICENSE).
