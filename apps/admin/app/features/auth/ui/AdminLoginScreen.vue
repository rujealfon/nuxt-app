<script setup lang="ts">
import type { LoginCredentials } from '@nuxt-app/types'
import type { AuthFormField } from '@nuxt/ui'
import { loginSchema } from '@nuxt-app/types'

const route = useRoute()
const { signIn, isPending } = useAuth()

const fields: AuthFormField[] = [
  { name: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
  { name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', required: true },
]

const redirectTo = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/',
)

async function handleSubmit(credentials: LoginCredentials) {
  await signIn(credentials)
}
</script>

<template>
  <AuthScreen
    title="Admin sign in"
    description="Administrator access only."
    icon="i-lucide-shield"
    :schema="loginSchema"
    :fields="fields"
    submit-label="Sign in"
    :loading="isPending"
    failure-message="Invalid email or password"
    :redirect-to="redirectTo"
    :submit-action="handleSubmit"
  />
</template>
