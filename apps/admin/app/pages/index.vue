<script setup lang="ts">
import HomeWelcomeCard from '@admin/features/home/components/HomeWelcomeCard.vue'

definePageMeta({
  middleware: 'admin',
})

const { logout } = useAuth()
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

    <HomeWelcomeCard />
  </div>
</template>
