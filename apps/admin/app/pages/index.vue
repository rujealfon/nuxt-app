<script setup lang="ts">
definePageMeta({
  middleware: 'admin',
})

const { user, logout } = useAuth()
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-12">
    <header class="mb-10 flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Admin Panel
      </h1>
      <UButton color="error" @click="logout()">
        Logout
      </UButton>
    </header>

    <UCard>
      <h2 class="mb-1 text-lg font-semibold">
        Hello, {{ user?.name }}
      </h2>
      <p class="mb-6 text-slate-400">
        {{ user?.email }} · role: {{ user?.role }}
      </p>
      <p class="text-sm text-slate-500">
        This is the admin area. You can manage posts, users, and site content from here.
      </p>
    </UCard>
  </div>
</template>
