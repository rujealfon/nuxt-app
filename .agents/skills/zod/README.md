# Zod Skill

Define, validate, and parse data with Zod (v4) — request bodies, form inputs,
environment variables, API responses, and any other untrusted or external
data in TypeScript/JavaScript.

## Installation

Install the skill with:

```bash
npx skills add rujealfon/skills --skill zod
```

Then ask your agent:

```text
Use $zod to validate this API request body and infer its TypeScript type.
```

## Coverage

The skill provides focused guidance for:

- Schema types: primitives, string formats (email/URL/UUID/ISO dates/IP/JWT/hashes/etc.), numbers, objects and their modifiers, arrays/tuples, unions/discriminated unions/XOR/intersections, records, maps/sets, files, recursive schemas, template literals
- Refinements and transforms: `.refine()`/`.superRefine()`/`.check()`, pipes, `.transform()`/`.preprocess()`, defaults/prefaults/catch, branded types, readonly, `z.function()`, `z.custom()`
- Error handling: customizing messages (schema-level, per-parse, global, i18n locales) and formatting `ZodError` with `treeifyError`/`prettifyError`/`flattenError`
- Codecs: bidirectional transforms with `z.codec()`, `.encode()`/`.decode()`, and ready-to-use implementations for common conversions
- JSON Schema: `z.toJSONSchema()`/`z.fromJSONSchema()` for OpenAPI specs and LLM structured outputs
- Metadata and registries: `.meta()`, `.describe()`, `z.globalRegistry`, custom registries
- Migrating a codebase from Zod 3 to Zod 4, and choosing between regular Zod, Zod Mini, and `zod/v4/core`

The target project's installed `zod` version is the authority for which API
surface is valid — the skill directs agents to check what's actually
installed before relying on a reference, since the string-format methods,
error-customization API, and `.default()` semantics all changed meaningfully
between Zod 3 and Zod 4.

## Contents

- [SKILL.md](SKILL.md) contains the core agent workflow.
- [references/schema-types.md](references/schema-types.md) covers every schema type and its modifiers.
- [references/refinements-transforms.md](references/refinements-transforms.md) covers refinements, transforms, pipes, and value modifiers.
- [references/errors.md](references/errors.md) covers error customization and formatting.
- [references/codecs.md](references/codecs.md) covers bidirectional transforms.
- [references/json-schema.md](references/json-schema.md) covers JSON Schema conversion.
- [references/metadata-registries.md](references/metadata-registries.md) covers metadata and registries.
- [references/migration-v3-to-v4.md](references/migration-v3-to-v4.md) covers the Zod 3 → 4 migration and package variant selection.

## License

Repository content is available under the root [MIT License](../../LICENSE).
