<script setup lang="ts">
import AuthScreen from '@nuxt-app/ui/components/AuthScreen.vue'
import { computed } from 'vue'
import { useAuth, usePasswordAuthScreen, useRoute } from '#imports'

const route = useRoute()
const { signIn } = useAuth()

const redirectTo = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/',
)

const { screenProps } = usePasswordAuthScreen({
  mode: 'login',
  submit: signIn,
  redirectTo,
  fallbackMessage: 'Invalid email or password',
})
</script>

<template>
  <AuthScreen
    v-bind="screenProps"
    title="Admin sign in"
    description="Administrator access only."
    icon="i-lucide-shield"
    submit-label="Sign in"
  />
</template>
