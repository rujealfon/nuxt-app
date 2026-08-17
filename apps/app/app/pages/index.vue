<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { user, logout } = useAuth()
</script>

<template>
  <div class="mx-auto max-w-xl px-6 py-12">
    <header class="mb-10 flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Nuxt App
      </h1>
      <UButton color="error" @click="logout()">
        Logout
      </UButton>
    </header>

    <UCard>
      <h2 class="mb-1 text-xl font-semibold">
        Welcome, {{ user?.name }}!
      </h2>
      <p class="mb-6 text-gray-500">
        {{ user?.email }}
      </p>

      <dl class="space-y-3 text-sm">
        <div class="flex justify-between border-b border-gray-100 py-3">
          <dt class="text-gray-500">
            User ID
          </dt>
          <dd class="font-mono">
            {{ user?.id }}
          </dd>
        </div>
        <div class="flex justify-between py-3">
          <dt class="text-gray-500">
            Role
          </dt>
          <dd class="font-medium capitalize">
            {{ user?.role }}
          </dd>
        </div>
      </dl>
    </UCard>
  </div>
</template>
