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
      <h1 class="text-2xl font-bold text-highlighted">
        Admin Panel
      </h1>
      <div class="flex items-center gap-2">
        <UColorModeButton />
        <UButton color="neutral" variant="outline" @click="logout()">
          Logout
        </UButton>
      </div>
    </header>

    <HomeWelcomeCard />
  </div>
</template>
