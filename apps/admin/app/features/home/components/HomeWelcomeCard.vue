<script setup lang="ts">
const { user } = useAuth()
</script>

<template>
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
</template>
