import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import boundaries from 'eslint-plugin-boundaries'

const root = fileURLToPath(new URL('.', import.meta.url))
const appTypes = ['app', 'frontend', 'server', 'feature', 'service', 'http']

// More specific elements precede their containing app or package.
export const architecture = {
  name: 'nuxt-app/architecture',
  files: ['apps/**/*.{ts,vue}', 'packages/**/*.{ts,vue}'],
  plugins: { boundaries },
  settings: {
    'boundaries/root-path': root,
    'boundaries/elements': [
      { type: 'feature', pattern: 'apps/*/app/features/*', capture: ['app', 'name'] },
      { type: 'service', pattern: 'apps/*/server/services/*', capture: ['app', 'name'] },
      { type: 'http', pattern: 'apps/*/server/{api,routes,middleware,plugins}', capture: ['app'] },
      { type: 'frontend', pattern: 'apps/*/app', capture: ['app'] },
      { type: 'server', pattern: 'apps/*/server', capture: ['app'] },
      { type: 'app', pattern: 'apps/*', capture: ['app'] },
      { type: 'package', pattern: 'packages/*', capture: ['name'] },
    ],
    'import/resolver': {
      typescript: {
        project: false,
        extensions: ['.ts', '.tsx', '.js', '.mjs', '.vue', '.json'],
      },
    },
  },
  rules: {
    'boundaries/dependencies': ['error', {
      default: 'allow',
      checkAllOrigins: true,
      policies: [
        {
          to: { element: { type: ['feature', 'service'], fileInternalPath: '!index.ts' } },
          disallow: { to: { element: { type: ['feature', 'service'] } } },
          message: 'Import a feature or service through its public index.ts entrypoint.',
        },
        {
          from: { element: { type: 'package' } },
          disallow: { to: { element: { type: appTypes } } },
          message: 'Shared packages must remain independent of applications.',
        },
        {
          from: { element: { type: appTypes } },
          disallow: {
            to: {
              element: { type: appTypes, captured: { app: '!{{ from.element.captured.app }}' } },
            },
          },
          message: 'Share code through packages instead of importing another application.',
        },
        {
          from: { element: { type: ['frontend', 'feature'] } },
          disallow: { to: { element: { type: ['server', 'service', 'http'] } } },
          message: 'Frontend code must access server behavior through HTTP and shared contracts.',
        },
        {
          from: { element: { type: 'feature' } },
          disallow: { to: { element: { type: ['feature', 'frontend', 'app'] } } },
          message: 'Keep features independent; compose them in routes or app-level workflows.',
        },
        {
          from: { element: { type: 'service' } },
          disallow: {
            to: { element: { type: ['service', 'http', 'frontend', 'feature', 'app'] } },
          },
          message: 'Keep services independent of versioned-route handlers and peer domains; '
            + 'compose them in server workflows.',
        },
      ],
    }],
  },
}

// Server code imports across folders through Nuxt's #server alias, so moving or
// nesting a file does not rewrite its imports. The resolver below teaches ESLint
// the alias; this guard rejects the parent-relative form it replaces.
const moduleSelectors = [
  'ImportDeclaration',
  'ImportExpression',
  'ExportNamedDeclaration',
  'ExportAllDeclaration',
]
function restrictImports(pattern, message) {
  return moduleSelectors.map(type => ({ selector: `${type}[source.value=${pattern}]`, message }))
}

const parentRelative = restrictImports(
  '/^\\.\\.\\//',
  'Use the "#server/..." alias instead of a parent-relative import.',
)

export const serverAliasGuard = {
  name: 'nuxt-app/server-alias',
  files: ['apps/*/server/**/*.ts'],
  rules: { 'no-restricted-syntax': ['error', ...parentRelative] },
}

// Services receive `db` or a transaction handle as an argument. The helpers in
// utils/db are bound to the Nitro runtime, so route handlers and workflows wire them,
// and a service must not reach a database or the Nitro runtime config another way:
// importing `nitropack/runtime`, a driver (`pg`, `drizzle-orm/node-postgres`), or the
// `createDb` factory as a value. Types stay importable (`Database` from utils/db-core,
// `import type`, inline `type` specifiers). A later config object replaces the rule
// options above for these files, so it repeats the alias guard.
const typeImport = '[importKind!="type"]'
const typeExport = '[exportKind!="type"]'
const driverModules = 'pg|drizzle-orm\\/node-postgres'
// `#imports` is Nuxt's alias for composables, `useRuntimeConfig` among them.
const runtimeModules = `/^(nitropack\\/runtime|#imports|${driverModules})(\\/|$)/`
const dbCore = '/(^|\\/)utils\\/db-core(\\.ts)?$/'
const createDbName = ':matches([imported.name="createDb"],[imported.value="createDb"])'
const createDbLocal = ':matches([local.name="createDb"],[local.value="createDb"])'

const databaseHelperGuard = restrictImports(
  '/(^|\\/)utils\\/db(\\.ts)?$/',
  'Services receive `db` or a transaction handle as an argument; '
  + 'route handlers or workflows wire `useDb()`. Import types from "#server/utils/db-core".',
)

function moduleGuard(modules, message) {
  return [
    `ImportDeclaration${typeImport}`,
    `ExportNamedDeclaration${typeExport}`,
    `ExportAllDeclaration${typeExport}`,
    'ImportExpression',
  ].map(selector => ({ selector: `${selector}[source.value=${modules}]`, message }))
}

const runtimeModuleGuard = moduleGuard(
  runtimeModules,
  'Services must not import the Nitro runtime or a database driver; '
  + 'receive `db` as an argument and let handlers or workflows read runtime config.',
)

const createDbMessage = 'Services must not construct a database; '
  + 'receive `db` as an argument. Import only types from "#server/utils/db-core".'

const createDbGuard = [
  `ImportDeclaration${typeImport}[source.value=${dbCore}] > ImportSpecifier${typeImport}`
  + `${createDbName}`,
  `ImportDeclaration${typeImport}[source.value=${dbCore}] > ImportNamespaceSpecifier`,
  `ExportNamedDeclaration${typeExport}[source.value=${dbCore}] > ExportSpecifier${typeExport}`
  + `${createDbLocal}`,
  `ExportNamedDeclaration${typeExport}[source.value=${dbCore}] > ExportNamespaceSpecifier`,
  `ExportAllDeclaration${typeExport}[source.value=${dbCore}]`,
  `ImportExpression[source.value=${dbCore}]`,
].map(selector => ({ selector, message: createDbMessage }))

export const serviceDatabaseGuard = {
  name: 'nuxt-app/service-database',
  files: ['apps/*/server/services/**/*.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      ...parentRelative,
      ...databaseHelperGuard,
      ...runtimeModuleGuard,
      ...createDbGuard,
    ],
  },
}

// Route handlers sit at the HTTP edge, where a returned `Result` must be unwrapped
// (ADR 0005). Build them with `defineResultHandler` or `defineVersionedHandler`, which
// unwrap or reject a raw `Result`, instead of a plain h3 or Nitro event handler.
// Specs are not routes, so they stay unrestricted. A later config object replaces the
// rule options above for these files, so each repeats the alias guard.
// The names are listed, case-sensitively: h3 also exports the `EventHandler` type,
// which a case-insensitive pattern would flag when imported without `type`.
const handlerFactory = '/^(eventHandler|defineEventHandler|lazyEventHandler'
  + '|defineLazyEventHandler|cachedEventHandler|defineCachedEventHandler)$/'
const handlerModules = '/^(h3|nitropack\\/runtime|#imports)$/'
const handlerMessage = 'Build route handlers with `defineResultHandler` '
  + '(#server/utils/result-handler) or `defineVersionedHandler` (#server/utils/versioned) '
  + 'so a returned `Result` is unwrapped, not a plain event handler.'
const handlerImport = `ImportDeclaration${typeImport}[source.value=${handlerModules}]`
const handlerExport = `ExportNamedDeclaration${typeExport}[source.value=${handlerModules}]`
const handlerName = `:matches([imported.name=${handlerFactory}],[imported.value=${handlerFactory}])`
const handlerLocal = `:matches([local.name=${handlerFactory}],[local.value=${handlerFactory}])`

const handlerGuard = [
  `${handlerImport} > ImportSpecifier${typeImport}${handlerName}`,
  `${handlerImport} > ImportNamespaceSpecifier`,
  `${handlerExport} > ExportSpecifier${typeExport}${handlerLocal}`,
  `ExportAllDeclaration${typeExport}[source.value=${handlerModules}]`,
  `ImportExpression[source.value=${handlerModules}]`,
].map(selector => ({ selector, message: handlerMessage }))

export const handlerFactoryGuard = {
  name: 'nuxt-app/route-handler-factory',
  files: ['apps/*/server/api/**/*.ts'],
  ignores: ['**/*.spec.ts'],
  rules: { 'no-restricted-syntax': ['error', ...parentRelative, ...handlerGuard] },
}

// Documented exemption (ADR 0005): unversioned infrastructure routes that have no
// `Result`-returning service and answer with their own body (health probes, the version
// registry, the OpenAPI document, the dev-only docs UI and its bundle) or throw the
// not-found failure (the catch-all). They keep a plain event handler; their responses
// are the contract. Add no route that calls a service here.
export const handlerFactoryExemption = {
  name: 'nuxt-app/route-handler-factory/infrastructure',
  files: [
    'apps/api/server/api/[[]...slug].ts',
    'apps/api/server/api/docs-assets/standalone.js.get.ts',
    'apps/api/server/api/docs.get.ts',
    'apps/api/server/api/health.get.ts',
    'apps/api/server/api/health/ready.get.ts',
    'apps/api/server/api/index.get.ts',
    'apps/api/server/api/openapi.json.get.ts',
  ],
  rules: { 'no-restricted-syntax': ['error', ...parentRelative] },
}

// Order matters: the exemption replaces the guard's options for its files.
export const handlerGuards = [handlerFactoryGuard, handlerFactoryExemption]

// Resolve aliases per workspace: ~/features/auth means different files in app/admin.
// Explicit aliases also let lint run without relying on generated Nuxt tsconfigs.
export const workspaceResolvers = ['apps', 'packages'].flatMap(parent =>
  readdirSync(new URL(`./${parent}/`, import.meta.url), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(({ name }) => {
      const directory = `${root}${parent}/${name}`
      return {
        name: `nuxt-app/resolver/${parent}/${name}`,
        files: [`${parent}/${name}/**/*.{ts,vue}`],
        settings: {
          'import/resolver': {
            typescript: {
              project: false,
              alias: {
                '~': [`${directory}/app`],
                '@': [`${directory}/app`],
                '~~': [directory],
                '@@': [directory],
                '#server': [`${directory}/server`],
                '#shared': [`${directory}/shared`],
              },
            },
          },
        },
      }
    }),
)
