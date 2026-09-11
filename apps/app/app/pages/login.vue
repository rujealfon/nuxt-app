<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { z } from 'zod'

const { login } = useAuth()
const { mutateAsync: signIn, isLoading: isSigningIn } = login

const fields: AuthFormField[] = [
  { name: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
  { name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', required: true },
]

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

type Schema = z.output<typeof schema>

const errorMessage = ref('')

async function onSubmit(event: FormSubmitEvent<Schema>) {
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
        :schema="schema"
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
