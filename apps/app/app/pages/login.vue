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
  <div class="flex min-h-dvh items-center justify-center p-6">
    <UPageCard class="w-full max-w-md">
      <AuthLoginForm register-to="/register" @success="onSuccess" />
    </UPageCard>
  </div>
</template>
