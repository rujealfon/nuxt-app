<script setup lang="ts">
const { login, error, isAuthenticated } = useAuth()
const route = useRoute()

const email = ref('')
const password = ref('')
const submitting = ref(false)

if (isAuthenticated.value) {
  await navigateTo('/')
}

async function onSubmit() {
  if (!email.value || !password.value) return
  submitting.value = true
  try {
    await login(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/'
    await navigateTo(redirect)
  } catch {
    // error is already set in composable
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;">
    <div style="width: 100%; max-width: 400px; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
      <h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; text-align: center;">Sign in</h1>
      <p style="color: #6b7280; text-align: center; margin-bottom: 32px; font-size: 0.875rem;">
        Access your account
      </p>

      <form @submit.prevent="onSubmit" style="display: grid; gap: 16px;">
        <div>
          <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 6px;">Email</label>
          <input
            v-model="email"
            type="email"
            required
            style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; outline: none;"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 6px;">Password</label>
          <input
            v-model="password"
            type="password"
            required
            style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; outline: none;"
            placeholder="••••••••"
          />
        </div>

        <p v-if="error" style="color: #ef4444; font-size: 0.875rem;">{{ error }}</p>

        <button
          type="submit"
          :disabled="submitting"
          style="width: 100%; padding: 12px; background: #111827; color: white; border: none; border-radius: 8px; font-weight: 500;"
        >
          {{ submitting ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <p style="text-align: center; margin-top: 24px; font-size: 0.875rem; color: #6b7280;">
        Don't have an account?
        <NuxtLink to="/register" style="color: #111827; font-weight: 500; text-decoration: none;">Create one</NuxtLink>
      </p>
    </div>
  </div>
</template>
