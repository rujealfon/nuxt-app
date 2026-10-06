# Pinia Colada skill

Queries, mutations, cache consistency, Nuxt integration, and async data diagnostics.

## Use in this repository

This skill is installed under `.agents/skills/pinia-colada`. Invoke it by name:

```text
Use $pinia-colada to implement and verify async data fetching in this Vue application.
```

Read [SKILL.md](SKILL.md) for the workflow and task-specific reference pointers.
Use that index to select references for the change you are making.

## Version

The [changelog](CHANGELOG.md) records skill versions separately from package
versions. The bundled references have these verification baselines:

| Package | Reference baseline | Last verification |
| --- | --- | --- |
| `@pinia/colada` | 1.4.5 | 2026-09-21 |

Use the project's installed package declarations and source as the API authority.
For details they do not resolve, consult the [official documentation index](https://pinia-colada.esm.dev/llms.txt).
A reference baseline records past verification, not the latest upstream release.

## Install elsewhere

```bash
npx skills add rujealfon/skills --skill pinia-colada
```

[skills-lock.json](../../../skills-lock.json) records the upstream source and
installed skill metadata for this repository.
