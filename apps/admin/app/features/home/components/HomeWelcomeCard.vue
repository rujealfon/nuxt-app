<script setup lang="ts">
const { user } = useAuth()
</script>

<template>
  <UCard>
    <h2 class="mb-1 text-lg font-semibold text-highlighted">
      Hello, {{ user?.name }}
    </h2>
    <p class="mb-6 text-muted">
      {{ user?.email }} · role: {{ user?.role }}
    </p>
    <p class="text-sm text-toned">
      This is the admin area. You can manage posts, users, and site content from here.
    </p>
  </UCard>
</template>
