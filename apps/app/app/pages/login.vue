<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})

const route = useRoute()

async function onSuccess() {
  const redirect = (route.query.redirect as string) || '/'
  await navigateTo(redirect)
}
</script>

<template>
  <AuthPageShell>
    <AuthLoginForm register-to="/register" @success="onSuccess" />
  </AuthPageShell>
</template>
