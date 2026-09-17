<script setup lang="ts">
import type { AuthFormField } from '@nuxt/ui'
import { loginSchema } from '@nuxt-app/types'

const route = useRoute()
const { signIn } = useAuth()

const fields: AuthFormField[] = [
  { name: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
  { name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', required: true },
]

const redirectTo = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/',
)
</script>

<template>
  <AuthScreen
    title="Admin sign in"
    description="Administrator access only."
    icon="i-lucide-shield"
    :schema="loginSchema"
    :fields="fields"
    submit-label="Sign in"
    failure-message="Invalid email or password"
    :redirect-to="redirectTo"
    :submit-action="signIn"
  />
</template>
