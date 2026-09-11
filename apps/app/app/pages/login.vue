<script setup lang="ts">
import type { LoginCredentials } from '@mysite/types'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { loginSchema } from '@mysite/types'

const { login } = useAuth()
const { mutateAsync: signIn, isLoading: isSigningIn } = login

const fields: AuthFormField[] = [
  { name: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
  { name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', required: true },
]

const errorMessage = ref('')

async function onSubmit(event: FormSubmitEvent<LoginCredentials>) {
  errorMessage.value = ''

  try {
    await signIn(event.data)
    await navigateTo('/')
  }
  catch {
    errorMessage.value = 'Invalid email or password'
  }
}

useHead({ title: 'Sign in · mysite' })
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center px-6">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="loginSchema"
        :fields="fields"
        title="Welcome back"
        description="Sign in to your account."
        icon="i-lucide-lock"
        :submit="{ label: 'Sign in', block: true, loading: isSigningIn }"
        @submit="onSubmit"
      >
        <template #validation>
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="soft"
            :title="errorMessage"
          />
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
