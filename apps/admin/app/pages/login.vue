<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})

async function onSuccess() {
  await navigateTo('/')
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center p-6">
    <UPageCard class="w-full max-w-md">
      <AuthLoginForm
        title="Admin login"
        description="Administrator access only."
        require-role="admin"
        @success="onSuccess"
      />
    </UPageCard>
  </div>
</template>
