<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})

async function onSuccess() {
  await navigateTo('/login')
}
</script>

<template>
  <AuthPageShell>
    <AuthRegisterForm @success="onSuccess" />
  </AuthPageShell>
</template>
