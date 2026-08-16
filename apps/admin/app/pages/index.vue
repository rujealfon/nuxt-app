<script setup lang="ts">
import { authClient } from '@mysite/auth/client'
import type { AuthUser } from '@mysite/types'

const user = ref<AuthUser | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const res = await authClient.me()
    user.value = res.user
    if (!user.value) {
      await navigateTo('/login')
    } else if (user.value.role !== 'admin') {
      error.value = 'You need admin privileges to access this panel.'
    }
  } catch {
    await navigateTo('/login')
  } finally {
    loading.value = false
  }
})

async function logout() {
  await authClient.logout()
  await navigateTo('/login')
}
</script>

<template>
  <div style="max-width: 800px; margin: 0 auto; padding: 48px 24px;">
    <div v-if="loading" style="text-align: center; padding: 80px 0; color: #94a3b8;">Loading...</div>

    <template v-else-if="error">
      <div style="background: #1e293b; border-radius: 12px; padding: 32px; text-align: center;">
        <p style="color: #f87171; margin-bottom: 16px;">{{ error }}</p>
        <button @click="logout" style="padding: 8px 16px; background: #334155; color: white; border: none; border-radius: 6px;">
          Logout
        </button>
      </div>
    </template>

    <template v-else>
      <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
        <h1 style="font-size: 1.5rem; font-weight: 700;">Admin Panel</h1>
        <button
          @click="logout"
          style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; font-size: 0.875rem;"
        >
          Logout
        </button>
      </header>

      <div style="background: #1e293b; border-radius: 12px; padding: 32px;">
        <h2 style="font-size: 1.125rem; margin-bottom: 8px;">Hello, {{ user?.name }}</h2>
        <p style="color: #94a3b8; margin-bottom: 24px;">{{ user?.email }} · role: {{ user?.role }}</p>
        <p style="color: #64748b; font-size: 0.875rem;">
          This is the admin area. You can manage posts, users, and site content from here.
        </p>
      </div>
    </template>
  </div>
</template>
