<script setup lang="ts">
import HomeWelcomeCard from '@app/features/home/components/HomeWelcomeCard.vue'

definePageMeta({
  middleware: 'auth',
})

const { logout } = useAuth()
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

    <HomeWelcomeCard />
  </div>
</template>
