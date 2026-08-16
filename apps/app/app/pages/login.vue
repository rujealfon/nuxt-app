<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})

const { login, error } = useAuth()
const route = useRoute()

const email = ref('')
const password = ref('')
const submitting = ref(false)

async function onSubmit() {
  if (!email.value || !password.value)
    return
  submitting.value = true
  try {
    await login(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/'
    await navigateTo(redirect)
  }
  catch {
    // error is already set in composable
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-6">
    <AppCard class="w-full max-w-md">
      <h1 class="mb-1 text-center text-2xl font-bold">
        Sign in
      </h1>
      <p class="mb-8 text-center text-sm text-gray-500">
        Access your account
      </p>

      <form class="grid gap-4" @submit.prevent="onSubmit">
        <AppInput v-model="email" type="email" label="Email" placeholder="you@example.com" required />
        <AppInput v-model="password" type="password" label="Password" placeholder="••••••••" required />

        <p v-if="error" class="text-sm text-red-500">
          {{ error }}
        </p>

        <AppButton type="submit" :disabled="submitting">
          {{ submitting ? 'Signing in...' : 'Sign in' }}
        </AppButton>
      </form>

      <p class="mt-6 text-center text-sm text-gray-500">
        Don't have an account?
        <NuxtLink to="/register" class="font-medium text-gray-900">
          Create one
        </NuxtLink>
      </p>
    </AppCard>
  </div>
</template>
