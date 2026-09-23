# Domain docs

Read the root `CONTEXT.md` before working with domain terms. Read the relevant decisions in `docs/adr/` before changing behavior they cover. If either document is absent, continue without creating it solely for this step.

Use the terms in `CONTEXT.md` in issues, proposals, and tests. If a concept is missing, check the code for the project's existing term before adding one to the glossary.

If a proposal conflicts with an ADR, name the decision and explain the conflict. For example, a proposal to call `.transaction()` on a `Database` value conflicts with [ADR 0002](../adr/0002-database-capability-seam.md).
