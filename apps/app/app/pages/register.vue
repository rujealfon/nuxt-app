<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})

async function onSuccess() {
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center p-6">
    <UPageCard class="w-full max-w-md">
      <AuthRegisterForm @success="onSuccess" />
    </UPageCard>
  </div>
</template>
