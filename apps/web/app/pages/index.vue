<script setup lang="ts">
const config = useRuntimeConfig()
const appOrigin = String(config.public.appUrl).replace(/\/$/, '')
const loginUrl = `${appOrigin}/login`
const registerUrl = `${appOrigin}/register`
</script>

<template>
  <div>
    <header class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <strong class="text-xl">Nuxt App</strong>
      <nav class="flex items-center gap-6 text-sm">
        <a :href="loginUrl">Login</a>
        <a
          :href="registerUrl"
          class="rounded-md bg-gray-900 px-4 py-2 text-white"
        >
          Get started
        </a>
      </nav>
    </header>

    <main class="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 class="mb-4 text-5xl font-extrabold tracking-tight">
        Build something great
      </h1>
      <p class="mb-10 text-xl text-gray-500">
        Site for nuxt-app.com. This is the public-facing landing page.
      </p>
      <a
        :href="registerUrl"
        class="inline-block rounded-lg bg-gray-900 px-7 py-3.5 font-medium text-white"
      >
        Start free →
      </a>
    </main>
  </div>
</template>
