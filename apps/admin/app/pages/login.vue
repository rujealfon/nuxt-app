<script setup lang="ts">
const { login, logout, error } = useAuth()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const localError = ref('')

async function onSubmit() {
  localError.value = ''
  submitting.value = true
  try {
    const res = await login(email.value, password.value)
    if (res.user.role !== 'admin') {
      localError.value = 'This account is not an admin.'
      await logout('')
      return
    }
    await navigateTo('/')
  }
  catch {
    localError.value = error.value || 'Login failed'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-6">
    <AppCard dark class="w-full max-w-md">
      <h1 class="mb-1 text-center text-2xl font-bold">
        Admin Login
      </h1>
      <p class="mb-8 text-center text-sm text-slate-400">
        Administrator access only
      </p>

      <form class="grid gap-4" @submit.prevent="onSubmit">
        <AppInput v-model="email" type="email" label="Email" required dark />
        <AppInput v-model="password" type="password" label="Password" required dark />

        <p v-if="localError" class="text-sm text-red-400">
          {{ localError }}
        </p>

        <AppButton type="submit" :disabled="submitting">
          {{ submitting ? 'Signing in...' : 'Sign in' }}
        </AppButton>
      </form>
    </AppCard>
  </div>
</template>
