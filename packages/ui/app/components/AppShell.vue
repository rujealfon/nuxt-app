<script setup lang="ts">
import AppHeader from './AppHeader.vue'
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <AppHeader />
    <main>
      <slot />
    </main>
  </UApp>
</template>
