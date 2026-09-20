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
          disallow: { to: { element: { type: appTypes, captured: { app: '!{{ from.element.captured.app }}' } } } },
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
          disallow: { to: { element: { type: ['service', 'http', 'frontend', 'feature', 'app'] } } },
          message: 'Keep services independent of versioned-route handlers and peer domains; compose them in server workflows.',
        },
      ],
    }],
  },
}

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
