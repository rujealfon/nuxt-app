<script setup lang="ts">
const { linkTo } = useSite()

function goToApp() {
  navigateTo(linkTo('app'), { external: true })
}

useHead({ title: 'mysite' })
</script>

<template>
  <section class="hero">
    <h1>Welcome to mysite</h1>
    <p>Public marketing site served from web.mysite.com.</p>
    <AppButton @click="goToApp">
      Open the app
    </AppButton>
  </section>
</template>

<style scoped>
.hero {
  max-width: 40rem;
  margin: 4rem auto;
  padding: 0 1.5rem;
  text-align: center;
}
</style>
