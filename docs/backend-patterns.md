# Backend Patterns and Growth Plan

## Status and scope

This guide establishes conventions for new backend features. The feature modules,
service entrypoints, and import rules in [the architecture guide](architecture.md)
are implemented. The API error contract is implemented; the policies,
repositories, and jobs described below are implementation guidance,
not existing runtime helpers.

The current versioned route is a greeting. Better Auth owns authentication and
its persistence adapter. Introduce the following patterns as real domain
operations appear, keeping the API one deployable application until there is a
concrete need for independent deployment.

## Adoption order

| Pattern | Introduce when | Completion evidence |
| --- | --- | --- |
| Use-case functions and pure rules | A business action has rules beyond request parsing | The operation is callable without an HTTP event; business-rule tests cover its outcomes. |
| Authorization policies | An operation reads or changes protected resources | Tests cover anonymous, allowed, and denied actors, including ownership or organization scope where applicable. |
| Domain failures and the error adapter | Versioned routes need consistent failure handling | Shared response schemas and HTTP tests verify codes, statuses, and safe messages. |
| Repositories and provider adapters | Queries become complex/reused, or external integrations appear | Tests exercise the real adapter; business tests substitute dependencies where useful. |
| Transactions and concurrency control | Related writes must be atomic or simultaneous edits can conflict | Database integration tests prove rollback, constraints, and conflict behavior. |
| State machines | A lifecycle has restricted transitions | Tests cover allowed and rejected transitions. |
| Idempotency, jobs, and an outbox | Retries or durable external effects are required | Tests cover duplicate/concurrent attempts and recovery after failure. |
| Tracing and audit records | Work spans requests/jobs or sensitive mutations need accountability | A workflow can be traced; audit records identify actor, action, resource, and outcome. |

## Business operations and policies

Keep HTTP parsing and response translation in `server/api/`. Put business
operations in `server/services/<domain>/`, exporting only the public operations
from `index.ts`. Accept validated input and a trusted actor context obtained on
the server. Keep calculations and decision rules as ordinary functions that
return results without database or HTTP dependencies.

An illustrative future module could contain:

```text
server/services/invitations/
├── index.ts
├── invite-member.ts
├── invitation-policy.ts
├── invitation-repository.ts
└── invite-member.spec.ts
```

Create each file when its responsibility exists. Keep repositories private to
the module. Shared database schemas, migrations, and connection setup remain in
`server/database/` and `server/utils/db.ts`. Cross-domain orchestration belongs in
`server/workflows/`, consistent with the existing import rules.

`requireActor(event)` establishes authentication only. Resource policies decide
whether that actor may perform the operation. Derive ownership, roles, and
membership from trusted data; scope reads as well as writes. Enforce policies
inside business operations so jobs and other entrypoints cannot bypass them.
Keep frontend access checks for navigation and presentation. Deny unmatched
permissions and check every protected request, following
[OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

## API error contract

Preserve this API error contract shape:

```json
{ "error": "not_found", "message": "The requested resource was not found" }
```

`invalid_input` may also include `details: { path, message }[]` when at least one input detail is usable. The key is omitted otherwise. Clients branch on `error`, never on message text; they use input details only to recover fields. The error adapter reads domain failures only: a thrown `ZodError` stays `internal_error`. A blank message override keeps `error` and the default safe message; `message` is never joined from details.
Define the shared schema and inferred types in `packages/types`. Keep
transport-independent business failures private to the server, and translate
them at the error adapter. The mapping is:

| `error` | HTTP status | Meaning |
| --- | --- | --- |
| `invalid_input` | 400 | Request data fails validation. |
| `unauthenticated` | 401 | A valid session is required. |
| `forbidden` | 403 | The actor cannot perform this operation. |
| `not_found` | 404 | The resource is absent or intentionally concealed by policy. |
| `conflict` | 409 | A uniqueness rule or concurrent change prevents completion. |
| `rate_limited` | 429 | The request rate limit was exceeded; retry headers are preserved. |
| `internal_error` | 500 | An unexpected failure occurred. |

Log unexpected failures with a correlation ID and return a safe generic message.
Keep stack traces, SQL details, credentials, and internal provider errors out of
responses. Preserve existing rate-limit status and retry headers.

The error adapter is implemented: domain code raises a domain failure, and the
error adapter (`server/error-adapter.ts`) renders the contract and normalizes unexpected
failures to `internal_error`. `useApi().parseApiError` reads a caught
versioned-route failure through the API error contract; screens that call those
routes consume `error` and, for `invalid_input`, input details. `X-Api-Version`
headers set before a failure survive onto the API error contract; assess
compatibility before changing an established version. Better Auth keeps its
own contract. Health 200s are custom; health failures use the API error contract.

## Persistence, transactions, and adapters

Use Drizzle directly for straightforward operations. Extract a domain-specific
repository when it hides meaningful query or mapping complexity. Prefer
operations named for their purpose over a generic base repository.

The business operation or cross-domain workflow owns the transaction. Pass the
same transaction handle into participating persistence operations. Use database
constraints to enforce uniqueness and relationships; use conditional updates or
version checks when concurrent edits must be detected. Avoid external network
calls inside database transactions.

The capability mismatch in `server/utils/db.ts` is resolved: the seam exposes a
`Database` type without `.transaction()`, and `withTransaction(fn)` is the only
transaction surface, failing loudly on the neon-http driver. Before implementing
a multi-write workflow, verify rollback against the supported database
configuration.

Keep vendor SDK calls inside adapters for email, payments, or storage. Inject
the small interface needed by the business operation through function arguments
or a factory when substitution is useful. Keep timeouts and retry decisions
explicit, and translate provider failures into meaningful operation outcomes.

## Workflows and reliable side effects

Model lifecycle states and legal transitions explicitly when business rules
require them. Start with a typed state and a transition function; add a state
machine library when orchestration warrants it. Persist transitions atomically
with concurrency checks when several actors can advance the same workflow.

For retryable mutations, define an idempotency key scoped to the actor or tenant
and operation. Persist the request identity and outcome, reject reuse with a
different payload, and coordinate concurrent attempts atomically. Define expiry
and replay behavior. See [AWS guidance on safe retries](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/).

Use durable jobs for work that must survive a request or process restart. When
a database change must trigger a job, write an outbox record in the same
transaction. A worker publishes committed records and tracks delivery. Consumers
must tolerate duplicates; define bounded retries and a recovery path for failed
jobs. See the [transactional outbox pattern](https://docs.aws.amazon.com/en_en/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html).

Carry correlation IDs from HTTP requests into jobs and external calls. Build on
the existing logger and introduce tracing as workflows span multiple operations.
Store security or business audit records separately from diagnostic logs, with
access and retention appropriate to their contents. Record only necessary data.

## First database-backed feature

Before coding, define the operation, actors, resource ownership, invariants,
atomic writes, and external effects. Then deliver one complete path:

1. Add request/response contracts and any required schema migration.
2. Implement the business operation, policy, and persistence code it needs.
3. Add the versioned route; raise domain failures so the error adapter can render the API error contract.
4. Test business rules, denied access, database constraints/rollback, and the
   versioned HTTP contract. Use a dedicated test database with deterministic
   setup and cleanup for persistence tests; mocks cannot prove SQL semantics.
5. Document any new test-service requirement in the README and CI. The current
   suite needs no external services; keep that distinction explicit.
6. Run lint, type checks, relevant tests, and the production build.

Introduce separate read models (CQRS) when read/write requirements diverge enough
to justify their maintenance. Introduce separate services when deployment,
scaling, or failure-isolation requirements warrant them. Evaluate event sourcing
only when replaying an authoritative event history is a product requirement.
These remain conditional choices; basic CQRS itself can use one database.
See [Microsoft's CQRS guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs).
