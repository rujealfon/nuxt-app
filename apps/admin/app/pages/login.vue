<script setup lang="ts">
definePageMeta({
  middleware: 'guest-admin',
})

async function onSuccess() {
  await navigateTo('/')
}
</script>

<template>
  <AuthPageShell>
    <AuthLoginForm
      title="Admin login"
      description="Administrator access only."
      require-role="admin"
      @success="onSuccess"
    />
  </AuthPageShell>
</template>
