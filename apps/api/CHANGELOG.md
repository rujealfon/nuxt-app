# Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.1.0 (2026-09-26)

### Features

* add Better Auth email/password flow to OpenAPI documentation and tests ([b1f964b](https://github.com/rujealfon/nuxt-app/commit/b1f964bf869f33b681dfceb909fe14c88435c8ea))
* add CI workflow for automated testing and linting ([399719a](https://github.com/rujealfon/nuxt-app/commit/399719a7e2b822d758c633092948102ac274bd83))
* add dev-only Scalar docs at /api/docs ([f32950b](https://github.com/rujealfon/nuxt-app/commit/f32950b643ffe20de5574c93d265052f8c4c2963))
* add logger middleware and utility for improved request logging ([5d77e4b](https://github.com/rujealfon/nuxt-app/commit/5d77e4b4f92daea0a31711a738fd40367dea2e80))
* add release pipeline smoke test marker ([#4](https://github.com/rujealfon/nuxt-app/issues/4)) ([1ec06ed](https://github.com/rujealfon/nuxt-app/commit/1ec06edf2d465ebac26189a6e46fc0ae8ba825c2))
* add repository guidelines for project structure, development commands, and testing conventions across all apps ([f4a1a7b](https://github.com/rujealfon/nuxt-app/commit/f4a1a7b04c3cf73277c6ac8ad8efc38e00ad0624))
* add stop-dev script to kill leftover dev server processes ([03efd91](https://github.com/rujealfon/nuxt-app/commit/03efd91ad432c2227e1a46c42d231d90fbfc8a5b))
* add unit tests for middleware and utility functions ([6c1421a](https://github.com/rujealfon/nuxt-app/commit/6c1421a13989bb570b7b14e18ecb0da44d7de72a))
* add unit tests for various components and middleware in the application ([44ac0e6](https://github.com/rujealfon/nuxt-app/commit/44ac0e6a52deb33d2816d8939d09e794143dc9f0))
* add vite-doctor framework diagnostics (advisory in CI) ([f4b811a](https://github.com/rujealfon/nuxt-app/commit/f4b811a1107a54fc513771ff17e7cf79b9d9b789))
* disable auto-imports and enforce explicit imports across the application ([229360a](https://github.com/rujealfon/nuxt-app/commit/229360acad3d294aaae2724f43146be3ac828633))
* enhance API documentation and response schemas; refactor error handling and loading states in auth components ([8d783e3](https://github.com/rujealfon/nuxt-app/commit/8d783e3480760465816d530f9c763f583f94a14a))
* enhance bearer token handling and response management for native clients ([33e1e04](https://github.com/rujealfon/nuxt-app/commit/33e1e0451316c262d06e0feb5aa6f4e0a7ed668e))
* enhance documentation with backend patterns and growth guidelines ([2f3c0aa](https://github.com/rujealfon/nuxt-app/commit/2f3c0aadaffed280b279ee549fa21d4be86cd311))
* enhance OpenAPI documentation with security schemes and versioned operation support ([b86f2fd](https://github.com/rujealfon/nuxt-app/commit/b86f2fde76bb78c1a4472f87cd3344e8d9d4c9bb))
* implement API versioning and enhance client configuration for versioned routes ([7ece98a](https://github.com/rujealfon/nuxt-app/commit/7ece98ad3eba458ef2e429db669a4d8c966b1c4e))
* implement API-only configuration and enhance error handling for non-API paths ([328d975](https://github.com/rujealfon/nuxt-app/commit/328d97579b26b545b7ef2d258f5d6c9ab035059b))
* implement bearer token handling for native clients with explicit origin validation ([a4aaf9d](https://github.com/rujealfon/nuxt-app/commit/a4aaf9db3970d77b8b484f16896bbe07bb9fe80b))
* implement bearer token support for native clients ([8075b63](https://github.com/rujealfon/nuxt-app/commit/8075b63dbe053e440ac61f2f55478e174abf1f5e))
* implement bearer token support for native clients and enhance session transport documentation ([cac26f2](https://github.com/rujealfon/nuxt-app/commit/cac26f2de720f43199f474a5cfac94312844abbc))
* implement product error handling and actor contract ([77c5c0b](https://github.com/rujealfon/nuxt-app/commit/77c5c0ba6669a6501d186db3674ff566725d070f))
* implement Redis-backed rate limiting for API routes ([ee0792b](https://github.com/rujealfon/nuxt-app/commit/ee0792be7c986c5f2bc5fae8a7d1d3f870620948))
* improve middleware and testing by removing unused methods and enhancing error handling ([2102700](https://github.com/rujealfon/nuxt-app/commit/2102700bcdf689a57686df13c6d5728b9d49b7fa))
* integrate Redis for Better Auth rate limiting and update environment configurations ([826e3ab](https://github.com/rujealfon/nuxt-app/commit/826e3ab1beb268f8dccd402e602b5ba82569fccc))
* normalize Better Auth errors to API error contract ([5e742fd](https://github.com/rujealfon/nuxt-app/commit/5e742fdc5637d5afb3363e8f9b85ee77599b3353))
* refactor database utilities and improve rate limit handling ([92425f4](https://github.com/rujealfon/nuxt-app/commit/92425f4e6019ee20fd1748b4b5b788e7d40aff86))
* refactor registration and login handling with new password auth screen composable ([bd10417](https://github.com/rujealfon/nuxt-app/commit/bd104173b983de95d2451bd81f4c7aaa77ac647d))
* update Better Auth sign-out request and response schemas in OpenAPI documentation ([d29f355](https://github.com/rujealfon/nuxt-app/commit/d29f355fddf52c0214d7b96849b1c54f9abe284d))

### Bug Fixes

* include workspace packages and root version ([#5](https://github.com/rujealfon/nuxt-app/issues/5)) ([ab8ccd9](https://github.com/rujealfon/nuxt-app/commit/ab8ccd90e1ae3e290593a3ef9d6aef441f8bd3f2))
* restrict bearer tokens and split auth OpenAPI ([454a126](https://github.com/rujealfon/nuxt-app/commit/454a1267fa9ff956c2b63be4bd30fe096c09b440))
* standardize apostrophe usage and improve clarity in documentation ([416d6dc](https://github.com/rujealfon/nuxt-app/commit/416d6dc63c43bdb28a6ffaf4cad1f6670deeef36))
