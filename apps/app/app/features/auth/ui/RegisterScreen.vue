<script setup lang="ts">
import type { AuthFormField } from '@nuxt/ui'
import { registerSchema } from '@nuxt-app/types'

const { signUp } = useAuth()

const fields: AuthFormField[] = [
  { name: 'name', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
  { name: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
  { name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', required: true },
]
</script>

<template>
  <AuthScreen
    title="Create your account"
    description="Sign up to get started."
    icon="i-lucide-user-plus"
    :schema="registerSchema"
    :fields="fields"
    submit-label="Create account"
    failure-message="Unable to create your account"
    redirect-to="/"
    :submit-action="signUp"
  >
    <template #footer>
      <p class="mt-4 text-center text-sm text-muted">
        Already have an account?
        <NuxtLink to="/login" class="text-primary font-medium">
          Sign in
        </NuxtLink>
      </p>
    </template>
  </AuthScreen>
</template>
