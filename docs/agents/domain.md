# Domain docs

How the engineering skills consume this repo's domain documentation.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/adr/`**: the ADRs that touch the area you are about to change.

`/domain-modeling` (via `/grill-with-docs` and `/improve-codebase-architecture`) creates a missing glossary or ADR when a term or decision is resolved.

## File structure

Single-context. One glossary and one ADR directory at the repo root:

```
/
├── GLOSSARY.md
└── docs/adr/
    ├── 0001-api-error-contract.md
    ├── 0002-database-capability-seam.md
    ├── 0003-bearer-tokens-for-native-clients.md
    └── 0004-auth-error-contract.md
```

## Use the glossary's vocabulary

When an issue title, a refactor proposal, a hypothesis, or a test name uses a domain concept, use the term as defined in `GLOSSARY.md`, including the synonyms listed under `_Avoid_`.

When the concept is missing from the glossary, check the code for the project's existing term. Note a real gap for `/domain-modeling`.

## Flag ADR conflicts

When output contradicts an existing ADR, name the decision and explain the conflict. A proposal to call `.transaction()` on a `Database` value conflicts with [ADR 0002](../adr/0002-database-capability-seam.md).
