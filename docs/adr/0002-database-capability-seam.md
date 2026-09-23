# Database capability seam

The `Database` type omits `.transaction()`. Callers use `withTransaction(fn)`,
which throws if the driver does not support transactions. The neon-http driver
declares `.transaction()` in its types but throws at runtime. The old cast hid
that mismatch from callers and the type checker.

## Considered options

- Capability flag (`{ db, transactions }`) for callers to branch on: rejected. Every query caller would pay for a need only transactions have.
- Failing at boot on incapable drivers: rejected. Neon remains a supported deployment, so the check can wait for the first feature that requires transactions.
