<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})

const { register, error } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const submitting = ref(false)

async function onSubmit() {
  if (!name.value || !email.value || !password.value)
    return
  submitting.value = true
  try {
    await register(email.value, password.value, name.value)
    await navigateTo('/')
  }
  catch {
    // error handled in composable
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
        Create account
      </h1>
      <p class="mb-8 text-center text-sm text-gray-500">
        Get started with Nuxt App
      </p>

      <form class="grid gap-4" @submit.prevent="onSubmit">
        <AppInput v-model="name" label="Name" placeholder="John Doe" required />
        <AppInput v-model="email" type="email" label="Email" placeholder="you@example.com" required />
        <AppInput v-model="password" type="password" label="Password" placeholder="At least 8 characters" required :minlength="8" />

        <p v-if="error" class="text-sm text-red-500">
          {{ error }}
        </p>

        <AppButton type="submit" :disabled="submitting">
          {{ submitting ? 'Creating account...' : 'Create account' }}
        </AppButton>
      </form>

      <p class="mt-6 text-center text-sm text-gray-500">
        Already have an account?
        <NuxtLink to="/login" class="font-medium text-gray-900">
          Sign in
        </NuxtLink>
      </p>
    </AppCard>
  </div>
</template>
