<script setup lang="ts">
import AuthScreen from '@nuxt-app/ui/components/AuthScreen.vue'
import { useAuth, usePasswordAuthScreen } from '#imports'

const { signUp } = useAuth()
const { screenProps } = usePasswordAuthScreen({
  mode: 'register',
  submit: signUp,
  redirectTo: '/',
  fallbackMessage: 'Unable to create your account',
})
</script>

<template>
  <AuthScreen
    v-bind="screenProps"
    title="Create your account"
    description="Sign up to get started."
    icon="i-lucide-user-plus"
    submit-label="Create account"
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
