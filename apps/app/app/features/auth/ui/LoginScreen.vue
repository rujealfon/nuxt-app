<script setup lang="ts">
import type { AuthFormField } from '@nuxt/ui'
import { loginSchema } from '@nuxt-app/types'
import AuthScreen from '@nuxt-app/ui/components/AuthScreen.vue'
import { useAuth, useAuthForm } from '#imports'

const { signIn } = useAuth()
const { errorMessage, submitting, onSubmit } = useAuthForm({
  submit: signIn,
  redirectTo: '/',
  fallbackMessage: 'Invalid email or password',
})

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
    :loading="submitting"
    :error-message="errorMessage"
    :submit="onSubmit"
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
