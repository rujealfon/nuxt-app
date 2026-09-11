<script setup lang="ts">
const { linkTo } = useSite()

function goToApp() {
  navigateTo(linkTo('app'), { external: true })
}

useHead({ title: 'mysite' })
</script>

<template>
  <section class="mx-auto mt-16 max-w-2xl px-6 text-center">
    <h1 class="text-3xl font-bold text-highlighted">
      Welcome to mysite
    </h1>
    <p class="mt-3 text-muted">
      Public marketing site served from web.mysite.com.
    </p>
    <UButton class="mt-6" size="lg" label="Open the app" @click="goToApp" />
  </section>
</template>
