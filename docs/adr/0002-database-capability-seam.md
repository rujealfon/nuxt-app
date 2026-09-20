# Database capability seam

Callers see a `Database` type with `.transaction()` deliberately removed, and transact only through `withTransaction(fn)`, which throws on drivers that cannot support one. The neon-http driver declares `.transaction()` in its types but throws at runtime; the cast this replaced hid that mismatch from every caller and the type system.

## Considered options

- Capability flag (`{ db, transactions }`) for callers to branch on: rejected. Every query caller would pay for a need only transactions have.
- Failing at boot on incapable drivers: rejected. Neon remains a supported deployment, so the check can wait for the first feature that requires transactions.
