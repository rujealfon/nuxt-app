<script setup lang="ts">
import type { RegisterCredentials } from '@nuxt-app/types'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { registerSchema } from '@nuxt-app/types'

const { signUp, isPending } = useAuth()

const fields: AuthFormField[] = [
  { name: 'name', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
  { name: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
  { name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', required: true },
]

const errorMessage = ref('')

async function onSubmit(event: FormSubmitEvent<RegisterCredentials>) {
  errorMessage.value = ''

  try {
    await signUp(event.data)
    await navigateTo('/')
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to create your account'
  }
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center px-6">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="registerSchema"
        :fields="fields"
        title="Create your account"
        description="Sign up to get started."
        icon="i-lucide-user-plus"
        :submit="{ label: 'Create account', block: true, loading: isPending }"
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
        Already have an account?
        <NuxtLink to="/login" class="text-primary font-medium">
          Sign in
        </NuxtLink>
      </p>
    </UPageCard>
  </div>
</template>
