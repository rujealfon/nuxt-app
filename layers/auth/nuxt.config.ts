import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { API_PROXY_PREFIX, vercelSpaFallbackRoutes } from '@nuxt-app/auth'
import { loadRootEnv } from '@nuxt-app/layer-base/load-root-env'
import { defineNuxtConfig } from 'nuxt/config'

loadRootEnv()

const apiUrl = (process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '')

export default defineNuxtConfig({
  $meta: { name: 'auth' },
  modules: ['@pinia/nuxt', '@pinia/colada-nuxt'],
  runtimeConfig: {
    public: {
      apiUrl,
    },
  },
  // Docker/local Nitro still proxies. On Vercel the same prefix is a CDN rewrite
  // (see compiled hook) so we do not emit a serverless function.
  routeRules: process.env.VERCEL
    ? {}
    : {
        [`${API_PROXY_PREFIX}/**`]: { proxy: `${apiUrl}/**` },
      },
  hooks: {
    'nitro:init': function (nitro) {
      nitro.hooks.hook('compiled', async () => {
        if (!nitro.options.static)
          return
        const configPath = resolve(nitro.options.output.dir, 'config.json')
        if (!existsSync(configPath))
          return
        const config = JSON.parse(await readFile(configPath, 'utf8')) as { routes?: unknown[] }
        config.routes = [...(config.routes ?? []), ...vercelSpaFallbackRoutes(apiUrl)]
        await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`)
      })
    },
  },
})
