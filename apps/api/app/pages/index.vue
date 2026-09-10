<script setup lang="ts">
useHead({ title: 'API · mysite' })
</script>

<template>
  <section class="api">
    <h1>mysite API</h1>
    <p>JSON API served from api.mysite.com. Try <code>/api/health</code>.</p>
  </section>
</template>

<style scoped>
.api {
  max-width: 40rem;
  margin: 4rem auto;
  padding: 0 1.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
