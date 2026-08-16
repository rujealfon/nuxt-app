<script setup lang="ts">
import { authClient } from '@mysite/auth/client'

const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function onSubmit() {
  error.value = ''
  submitting.value = true
  try {
    const res = await authClient.login({ email: email.value, password: password.value })
    if (res.user.role !== 'admin') {
      error.value = 'This account is not an admin.'
      await authClient.logout()
      return
    }
    await navigateTo('/')
  } catch (e: any) {
    error.value = e.message || 'Login failed'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;">
    <div style="width: 100%; max-width: 400px; background: #1e293b; border-radius: 12px; padding: 40px;">
      <h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; text-align: center;">Admin Login</h1>
      <p style="color: #94a3b8; text-align: center; margin-bottom: 32px; font-size: 0.875rem;">Administrator access only</p>

      <form @submit.prevent="onSubmit" style="display: grid; gap: 16px;">
        <div>
          <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 6px; color: #cbd5e1;">Email</label>
          <input
            v-model="email"
            type="email"
            required
            style="width: 100%; padding: 10px 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; outline: none;"
          />
        </div>
        <div>
          <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 6px; color: #cbd5e1;">Password</label>
          <input
            v-model="password"
            type="password"
            required
            style="width: 100%; padding: 10px 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; outline: none;"
          />
        </div>

        <p v-if="error" style="color: #f87171; font-size: 0.875rem;">{{ error }}</p>

        <button
          type="submit"
          :disabled="submitting"
          style="width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 500;"
        >
          {{ submitting ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>
