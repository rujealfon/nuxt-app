<script setup lang="ts">
import type { RegisterInput } from '@nuxt-app/types'
import { registerSchema } from '@nuxt-app/types'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  loginTo?: string
}>(), {
  title: 'Create account',
  description: 'Get started with Nuxt App.',
  loginTo: '/login',
})

const emit = defineEmits<{
  success: []
}>()

const { register, error } = useAuth()
const pending = ref(false)

const fields = [
  { name: 'name', type: 'text' as const, label: 'Name', placeholder: 'Jane Doe', required: true },
  { name: 'email', type: 'email' as const, label: 'Email', placeholder: 'you@example.com', required: true },
  { name: 'password', type: 'password' as const, label: 'Password', required: true },
]

async function onSubmit(event: { data: RegisterInput }) {
  pending.value = true
  try {
    await register(event.data.email, event.data.password, event.data.name)
    emit('success')
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
    :schema="registerSchema"
    :fields="fields"
    :title="props.title"
    :description="props.description"
    icon="i-lucide-user-plus"
    :submit="{ label: 'Create account', block: true, loading: pending }"
    @submit="onSubmit"
  >
    <template v-if="error" #validation>
      <UAlert color="error" :description="error" />
    </template>
    <template #footer>
      Already have an account?
      <ULink :to="props.loginTo" class="text-primary font-medium">
        Sign in
      </ULink>.
    </template>
  </UAuthForm>
</template>
