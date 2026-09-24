<script setup lang="ts">
import AuthScreen from '@nuxt-app/ui/components/AuthScreen.vue'
import { useAuth, usePasswordAuthScreen } from '#imports'

const { signIn } = useAuth()
const { screenProps } = usePasswordAuthScreen({
  mode: 'login',
  submit: signIn,
  redirectTo: '/',
  fallbackMessage: 'Invalid email or password',
})
</script>

<template>
  <AuthScreen
    v-bind="screenProps"
    title="Welcome back"
    description="Sign in to your account."
    icon="i-lucide-lock"
    submit-label="Sign in"
  >
    <template #footer>
      <p class="mt-4 text-center text-sm text-muted">
        New here?
        <NuxtLink to="/register" class="font-medium text-primary">
          Create an account
        </NuxtLink>
      </p>
    </template>
  </AuthScreen>
</template>
