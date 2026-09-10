# CRUD, operators, joins, transactions (PostgreSQL)

## Select

```typescript
import { eq, and, or, lt, gte, desc, count } from 'drizzle-orm';

await db.select().from(users);

await db.select({ id: users.id, name: users.name }).from(users); // partial select

await db.select().from(users).where(eq(users.id, 42));

await db.select().from(users).where(
  and(eq(users.id, 42), or(eq(users.role, 'admin'), eq(users.role, 'editor')))
);

await db.select().from(users).orderBy(desc(users.name)).limit(10).offset(5);

await db.select({ role: users.role, total: count() })
  .from(users)
  .groupBy(users.role);
```

`db.select()` with no argument returns every column. That's fine for narrow tables, but for anything with large `text`/`jsonb` columns or many columns, prefer the partial-select form (`db.select({ id: users.id, name: users.name })`) when the caller doesn't need the rest — Postgres still reads the full row internally, but you avoid deserializing and shipping unused bytes over the wire, which matters at scale or on large payload columns.

`and()`/`or()` compose explicitly — a common bug is passing multiple conditions straight to `.where()` expecting implicit AND; `.where()` only takes one expression, so nest `and(...)`/`or(...)` yourself when combining more than one condition.

## Operators (`import { ... } from 'drizzle-orm'`)

- Comparison: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`
- Null checks: `isNull`, `isNotNull`
- Sets: `inArray`, `notInArray`
- Postgres arrays: `arrayContains`, `arrayContained`, `arrayOverlaps`
- Pattern match: `like`, `notLike`, `ilike`, `notIlike`
- Range: `between`, `notBetween`
- Logic: `and`, `or`, `not`
- Subquery existence: `exists`, `notExists`
- Raw escape hatch: `sql\`...\`` for anything not covered (all interpolated `${}` values are parameterized automatically)

## Insert

```typescript
await db.insert(users).values({ name: 'Andrew' });

await db.insert(users).values([{ name: 'Andrew' }, { name: 'Dan' }]); // batch — one round trip, not N; prefer this over looping individual .insert() calls whenever inserting more than a couple of known rows at once

const [inserted] = await db.insert(users)
  .values({ name: 'Dan' })
  .returning({ id: users.id });

// Upsert: do nothing on conflict
await db.insert(users).values({ id: 1, name: 'John' })
  .onConflictDoNothing({ target: users.id });

// Upsert: update on conflict
await db.insert(users).values({ id: 1, name: 'Dan' })
  .onConflictDoUpdate({ target: users.id, set: { name: 'Dan' } });

// Composite conflict target
await db.insert(users).values({ firstName: 'John', lastName: 'Doe' })
  .onConflictDoUpdate({ target: [users.firstName, users.lastName], set: { firstName: 'John' } });
```

Use `typeof users.$inferInsert` for the input type when accepting insert payloads from elsewhere in the app, so optional/defaulted columns type-check correctly as optional.

## Update

```typescript
await db.update(users).set({ name: 'Mr. Dan' }).where(eq(users.name, 'Dan'));

await db.update(users).set({ updatedAt: sql`now()` }).where(eq(users.id, 1));

// UPDATE ... FROM, Postgres-specific
await db.update(users)
  .set({ cityId: cities.id })
  .from(cities)
  .where(and(eq(cities.name, 'Seattle'), eq(users.name, 'John')));

const [updated] = await db.update(users)
  .set({ name: 'Mr. Dan' })
  .where(eq(users.name, 'Dan'))
  .returning({ id: users.id });
```

`.set()` ignores `undefined` values (they're skipped, not set to NULL) and sets `null` explicitly when you pass `null` — this matters when building a `.set()` object from optional caller input.

## Delete

```typescript
await db.delete(users).where(eq(users.name, 'Dan'));

const [deleted] = await db.delete(users)
  .where(eq(users.name, 'Dan'))
  .returning({ id: users.id });
```

`db.delete(users)` with no `.where()` deletes every row — always double check a `.where()` is present unless truncation is actually intended.

## Joins

```typescript
await db.select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId));
// innerJoin, rightJoin, fullJoin also available
```

A plain `db.select().from(a).leftJoin(b, ...)` returns `{ users: {...}, posts: {...} | null }` — nested per-table objects, not a flattened row. Use [aliases](https://orm.drizzle.team/docs/joins) (`alias(table, 'name')`) when joining the same table to itself (self-joins, e.g. manager/employee).

## Transactions

```typescript
await db.transaction(async (tx) => {
  await tx.update(accounts).set({ balance: sql`${accounts.balance} - 100` }).where(eq(accounts.id, from));
  await tx.update(accounts).set({ balance: sql`${accounts.balance} + 100` }).where(eq(accounts.id, to));
});
```

- Use `tx`, not the outer `db`, for every statement inside the callback — using `db` bypasses the transaction.
- Keep the callback to database calls only. Any row a transaction touches stays locked until it commits or rolls back — an `await fetch(...)` or other slow external call inside `db.transaction()` holds those locks for the whole request, which can stall or deadlock unrelated queries hitting the same rows. Do slow/external work before or after the transaction, not inside it.
- Explicit rollback: call `tx.rollback()` inside the callback (this throws internally; don't wrap it in a try/catch that swallows it).
- Nested transactions use savepoints automatically: `await tx.transaction(async (tx2) => { ... })`.
- Postgres isolation options: `db.transaction(cb, { isolationLevel: 'read committed' | 'repeatable read' | 'serializable' | 'read uncommitted', accessMode: 'read write' | 'read only', deferrable: true })`.

## Set operations

```typescript
import { union, unionAll, intersect, except } from 'drizzle-orm/pg-core';

const result = await union(
  db.select({ name: users.name }).from(users),
  db.select({ name: customers.name }).from(customers),
).limit(10);

// or as a builder method:
await db.select({ name: users.name }).from(users)
  .union(db.select({ name: customers.name }).from(customers));
```

All of `union`/`unionAll`/`intersect`/`except` require the combined queries to select the same number and (compatible) type of columns, same as raw SQL.

## Dynamic query building

Query builders can only call `.where()`/`.orderBy()`/etc. once by default (matches SQL's one-clause-per-query shape) — call `.$dynamic()` first to build a query conditionally across multiple statements, e.g. inside a shared filtering helper:

```typescript
function withPagination<T extends PgSelect>(qb: T, page: number, pageSize = 10) {
  return qb.limit(pageSize).offset((page - 1) * pageSize);
}

const query = db.select().from(users).where(eq(users.active, true)).$dynamic();
const page2 = await withPagination(query, 2);
```
