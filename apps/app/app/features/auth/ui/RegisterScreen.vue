<script setup lang="ts">
import type { AuthFormField } from '@nuxt/ui'
import { registerSchema } from '@nuxt-app/types'
import AuthScreen from '@nuxt-app/ui/components/AuthScreen.vue'
import { useAuth, useAuthForm } from '#imports'

const { signUp } = useAuth()
const { errorMessage, fieldErrors, submitting, onSubmit } = useAuthForm({
  submit: signUp,
  redirectTo: '/',
  fallbackMessage: 'Unable to create your account',
})

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
    :loading="submitting"
    :error-message="errorMessage"
    :field-errors="fieldErrors"
    :submit="onSubmit"
  >
    <template #footer>
      <p class="mt-4 text-center text-sm text-muted">
        Already have an account?
        <NuxtLink to="/login" class="font-medium text-primary">
          Sign in
        </NuxtLink>
      </p>
    </template>
  </AuthScreen>
</template>
