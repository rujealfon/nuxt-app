# Zod skill

Zod 4 schemas, validation errors, transforms, codecs, JSON Schema, compilation, and v3 migration.

## Use in this repository

This skill is installed under `.agents/skills/zod`. Invoke it by name:

```text
Use $zod to validate this API request body and infer its TypeScript type.
```

Read [SKILL.md](SKILL.md) for the workflow and task-specific reference pointers.
Use that index to select references for the change you are making.

## Version

The [changelog](CHANGELOG.md) records skill versions separately from package
versions. The bundled references have these verification baselines:

| Package | Reference baseline | Last verification |
| --- | --- | --- |
| `zod` | 4.6.5 | 2026-09-21 |

Use the project's installed package declarations and source as the API authority.
For details they do not resolve, consult the [official documentation index](https://zod.dev/llms.txt).
A reference baseline records past verification, not the latest upstream release.

## Install elsewhere

```bash
npx skills add rujealfon/skills --skill zod
```

[skills-lock.json](../../../skills-lock.json) records the upstream source and
installed skill metadata for this repository.
