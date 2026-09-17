<script setup lang="ts">
import type { AuthFormField } from '@nuxt/ui'
import { loginSchema } from '@nuxt-app/types'

const { signIn, isPending } = useAuth()

const fields: AuthFormField[] = [
  { name: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
  { name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', required: true },
]
</script>

<template>
  <AuthScreen
    title="Welcome back"
    description="Sign in to your account."
    icon="i-lucide-lock"
    :schema="loginSchema"
    :fields="fields"
    submit-label="Sign in"
    :loading="isPending"
    failure-message="Invalid email or password"
    redirect-to="/"
    :submit-action="signIn"
  >
    <template #footer>
      <p class="mt-4 text-center text-sm text-muted">
        New here?
        <NuxtLink to="/register" class="text-primary font-medium">
          Create an account
        </NuxtLink>
      </p>
    </template>
  </AuthScreen>
</template>
