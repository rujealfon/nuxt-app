# Metadata and registries

Useful for attaching documentation, code-gen hints, AI structured-output examples, or form-validation metadata to schemas.

## Registries

A registry is a typed collection mapping schemas to metadata:

```typescript
const myRegistry = z.registry<{ description: string }>();

const mySchema = z.string();
myRegistry.add(mySchema, { description: "A cool schema!" });
myRegistry.has(mySchema);    // => true
myRegistry.get(mySchema);    // => { description: "A cool schema!" }
myRegistry.remove(mySchema);
myRegistry.clear();
```

TypeScript enforces that added metadata matches the registry's declared shape. The `id` field is special: registering two schemas with the same `id` in the same registry throws — this applies to `z.globalRegistry` too.

A registry declared without a metadata type works as a plain collection:

```typescript
const myRegistry = z.registry();
myRegistry.add(z.string());
```

### `.register()`

The one Zod method that does **not** return a new schema — it returns the original instance, letting you register metadata inline without breaking a chain:

```typescript
const mySchema = z.object({
  name: z.string().register(myRegistry, { description: "The user's name" }),
  age: z.number().register(myRegistry, { description: "The user's age" }),
});
```

## `z.globalRegistry` and `.meta()`

Zod ships a global registry for common documentation fields:

```typescript
interface GlobalMeta {
  id?: string;
  title?: string;
  description?: string;
  deprecated?: boolean;
  [k: string]: unknown;
}
```

`.meta()` is the convenient shorthand for registering into it:

```typescript
const emailSchema = z.email().meta({
  id: "email_address",
  title: "Email address",
  description: "Please enter a valid email address",
});

emailSchema.meta(); // retrieves the metadata (no-arg call)
```

Extend `GlobalMeta` project-wide via declaration merging (commonly placed in a `zod.d.ts`):

```typescript
declare module "zod" {
  interface GlobalMeta {
    examples?: unknown[];
  }
}
export {}
```

**Metadata is tied to a specific schema instance.** Because Zod methods are immutable and always return a new instance, metadata does not survive further chaining:

```typescript
const A = z.string().meta({ description: "A cool string" });
const B = A.refine(_ => true);
B.meta(); // => undefined — the refine() call produced a new schema
```

Attach `.meta()` *after* the schema is otherwise finished, or re-register on the final instance.

## `.describe()`

Shorthand for registering just a `description` in `z.globalRegistry` — kept for convenience, `.meta()` is the recommended general-purpose API:

```typescript
z.email().describe("An email address");
// equivalent to: z.email().meta({ description: "An email address" })
```

## Custom registries

### Referencing inferred types

Metadata can reference a schema's own inferred type via the special `z.$output`/`z.$input` symbols — handy for typed `examples` fields:

```typescript
type MyMeta = { examples: z.$output[] };
const myRegistry = z.registry<MyMeta>();

myRegistry.add(z.string(), { examples: ["hello", "world"] });
myRegistry.add(z.number(), { examples: [1, 2, 3] });
```

### Constraining accepted schema types

A second generic to `z.registry()` restricts which schema classes can be added:

```typescript
const myRegistry = z.registry<{ description: string }, z.ZodString>();
myRegistry.add(z.string(), { description: "A number" }); // ✅
myRegistry.add(z.number(), { description: "A number" }); // ❌ type error
```
