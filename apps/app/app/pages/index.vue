<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { user, logout } = useAuth()
</script>

<template>
  <div style="max-width: 640px; margin: 0 auto; padding: 48px 24px;">
    <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
      <h1 style="font-size: 1.5rem; font-weight: 700;">MySite App</h1>
      <button
        @click="logout"
        style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; font-size: 0.875rem;"
      >
        Logout
      </button>
    </header>

    <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="font-size: 1.25rem; margin-bottom: 8px;">Welcome, {{ user?.name }}!</h2>
      <p style="color: #6b7280; margin-bottom: 24px;">{{ user?.email }}</p>

      <div style="display: grid; gap: 12px; font-size: 0.875rem;">
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
          <span style="color: #6b7280;">User ID</span>
          <span style="font-family: monospace;">{{ user?.id }}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
          <span style="color: #6b7280;">Role</span>
          <span style="text-transform: capitalize; font-weight: 500;">{{ user?.role }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
