<script setup lang="ts">
const config = useRuntimeConfig()
const appOrigin = String(config.public.appUrl).replace(/\/$/, '')
const loginUrl = `${appOrigin}/login`
const registerUrl = `${appOrigin}/register`
</script>

<template>
  <div>
    <header class="flex items-center justify-between border-b border-default px-6 py-4">
      <strong class="text-xl text-highlighted">
        Nuxt App
      </strong>
      <nav class="flex items-center gap-3 text-sm">
        <UColorModeButton />
        <UButton :to="loginUrl" color="neutral" variant="ghost">
          Login
        </UButton>
        <UButton :to="registerUrl">
          Get started
        </UButton>
      </nav>
    </header>

    <main class="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 class="mb-4 text-5xl font-extrabold tracking-tight text-highlighted">
        Build something great
      </h1>
      <p class="mb-10 text-xl text-muted">
        Site for nuxt-app.com. This is the public-facing landing page.
      </p>
      <UButton :to="registerUrl" size="xl">
        Start free →
      </UButton>
    </main>
  </div>
</template>
