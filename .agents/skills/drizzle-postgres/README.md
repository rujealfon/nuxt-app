# Drizzle Postgres skill

PostgreSQL schemas, queries, migrations, and driver setup with Drizzle ORM and Drizzle Kit.

## Use in this repository

This skill is installed under `.agents/skills/drizzle-postgres`. Invoke it by name:

```text
Use $drizzle-postgres to add a users/posts schema with relations to this Postgres project.
```

Read [SKILL.md](SKILL.md) for the workflow and task-specific reference pointers.
Use that index to select references for the change you are making.

## Version

The [changelog](CHANGELOG.md) records skill versions separately from package
versions. The bundled references have these verification baselines:

| Package | Reference baseline | Last verification |
| --- | --- | --- |
| `drizzle-orm` | 0.45.2 | 2026-08-23 |
| `drizzle-kit` | 0.31.10 | 2026-08-23 |

The bundled 1.0 migration reference was checked against `1.0.0-rc.5`.
For a 1.0 upgrade, read
[the migration reference](references/migration-0.45-to-1.0.md) and verify it
against the installed release before applying changes.

Use the project's installed package declarations and source as the API authority.
For details they do not resolve, consult the [official documentation index](https://orm.drizzle.team/llms.txt).
A reference baseline records past verification, not the latest upstream release.

## Install elsewhere

```bash
npx skills add rujealfon/skills --skill drizzle-postgres
```

[skills-lock.json](../../../skills-lock.json) records the upstream source and
installed skill metadata for this repository.
