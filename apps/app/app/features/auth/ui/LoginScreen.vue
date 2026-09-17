<script setup lang="ts">
import type { LoginCredentials } from '@nuxt-app/types'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { loginSchema } from '@nuxt-app/types'

const { signIn, isPending } = useAuth()

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
        :submit="{ label: 'Sign in', block: true, loading: isPending }"
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
      <p class="mt-4 text-center text-sm text-muted">
        New here?
        <NuxtLink to="/register" class="text-primary font-medium">
          Create an account
        </NuxtLink>
      </p>
    </UPageCard>
  </div>
</template>
