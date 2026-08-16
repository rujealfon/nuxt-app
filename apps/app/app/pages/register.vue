<script setup lang="ts">
const { register, error, isAuthenticated } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const submitting = ref(false)

if (isAuthenticated.value) {
  await navigateTo('/')
}

async function onSubmit() {
  if (!name.value || !email.value || !password.value) return
  submitting.value = true
  try {
    await register(email.value, password.value, name.value)
    await navigateTo('/')
  } catch {
    // error handled in composable
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;">
    <div style="width: 100%; max-width: 400px; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
      <h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; text-align: center;">Create account</h1>
      <p style="color: #6b7280; text-align: center; margin-bottom: 32px; font-size: 0.875rem;">
        Get started with MySite
      </p>

      <form @submit.prevent="onSubmit" style="display: grid; gap: 16px;">
        <div>
          <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 6px;">Name</label>
          <input
            v-model="name"
            type="text"
            required
            style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; outline: none;"
            placeholder="John Doe"
          />
        </div>

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
            minlength="8"
            style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; outline: none;"
            placeholder="At least 8 characters"
          />
        </div>

        <p v-if="error" style="color: #ef4444; font-size: 0.875rem;">{{ error }}</p>

        <button
          type="submit"
          :disabled="submitting"
          style="width: 100%; padding: 12px; background: #111827; color: white; border: none; border-radius: 8px; font-weight: 500;"
        >
          {{ submitting ? 'Creating account...' : 'Create account' }}
        </button>
      </form>

      <p style="text-align: center; margin-top: 24px; font-size: 0.875rem; color: #6b7280;">
        Already have an account?
        <NuxtLink to="/login" style="color: #111827; font-weight: 500; text-decoration: none;">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>
