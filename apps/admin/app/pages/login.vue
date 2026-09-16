<script setup lang="ts">
import type { LoginCredentials } from '@nuxt-app/types'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { loginSchema } from '@nuxt-app/types'

const route = useRoute()
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
    await navigateTo(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
  }
  catch {
    errorMessage.value = 'Invalid email or password'
  }
}

useHead({ title: 'Sign in · admin' })
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center px-6">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="loginSchema"
        :fields="fields"
        title="Admin sign in"
        description="Administrator access only."
        icon="i-lucide-shield"
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
    </UPageCard>
  </div>
</template>
