<script setup lang="ts">
import type { AuthFormField } from '@nuxt/ui'
import { loginSchema } from '@nuxt-app/types'
import AuthScreen from '@nuxt-app/ui/components/AuthScreen.vue'
import { computed } from 'vue'
import { useAuth, useAuthForm, useRoute } from '#imports'

const route = useRoute()
const { signIn } = useAuth()

const fields: AuthFormField[] = [
  { name: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
  { name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', required: true },
]

const redirectTo = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/',
)

const { errorMessage, submitting, onSubmit } = useAuthForm({
  submit: signIn,
  redirectTo,
  fallbackMessage: 'Invalid email or password',
})
</script>

<template>
  <AuthScreen
    title="Admin sign in"
    description="Administrator access only."
    icon="i-lucide-shield"
    :schema="loginSchema"
    :fields="fields"
    submit-label="Sign in"
    :loading="submitting"
    :error-message="errorMessage"
    :submit="onSubmit"
  />
</template>
