<script setup lang="ts">
import type { AuthResponse, LoginInput } from '@nuxt-app/types'
import { loginSchema } from '@nuxt-app/types'
import { matchesRequiredRole } from '../utils/routeAccess'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  submitLabel?: string
  registerTo?: string
  requireRole?: 'user' | 'admin'
}>(), {
  title: 'Welcome back!',
  description: 'Sign in to your account.',
  submitLabel: 'Sign in',
})

const emit = defineEmits<{
  success: [res: AuthResponse]
}>()

const { login, logout, error } = useAuth()
const pending = ref(false)
const roleError = ref('')

const fields = [
  { name: 'email', type: 'email' as const, label: 'Email', placeholder: 'you@example.com', required: true },
  { name: 'password', type: 'password' as const, label: 'Password', required: true },
]

async function onSubmit(event: { data: LoginInput }) {
  pending.value = true
  roleError.value = ''
  try {
    const res = await login(event.data.email, event.data.password)
    if (!matchesRequiredRole(res.user, props.requireRole)) {
      roleError.value = `This account is not an ${props.requireRole}.`
      await logout('')
      return
    }
    emit('success', res)
  }
  catch {
    // error is set on useAuth
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <UAuthForm
    :schema="loginSchema"
    :fields="fields"
    :title="props.title"
    :description="props.description"
    icon="i-lucide-lock"
    :submit="{ label: props.submitLabel, block: true, loading: pending }"
    @submit="onSubmit"
  >
    <template v-if="error || roleError" #validation>
      <UAlert color="error" :description="error || roleError" />
    </template>
    <template v-if="props.registerTo" #footer>
      Don't have an account?
      <ULink :to="props.registerTo" class="text-primary font-medium">
        Sign up
      </ULink>.
    </template>
  </UAuthForm>
</template>
