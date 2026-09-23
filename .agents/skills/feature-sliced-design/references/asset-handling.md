# Asset placement in this Nuxt monorepo

Choose the owner before choosing a directory. Keep an asset beside the feature or component that uses it when the bundler should process the import. Move an asset to `packages/ui` when components in several apps use it. An app's `public/` directory holds files that need a stable URL and no build-time import, such as its favicon or `robots.txt`.

Use these paths:

- Feature-owned imported images and icons: `apps/<frontend-app>/app/features/<feature>/assets/`.
- Shared component assets and fonts: `packages/ui/app/assets/` or beside the shared component, following the package's existing layout.
- App-owned stable URLs: `apps/<frontend-app>/public/`.

Import bundled assets from the owner. Reference files in `public/` by their root URL. If several apps need the same public file, choose a shared package or a build-time copy with one source of truth; do not import from another app's `public/` directory.

Check the affected app's Nuxt config before adding asset transforms or aliases. Use the Nuxt and Nuxt UI skills when an asset needs framework-specific handling.
