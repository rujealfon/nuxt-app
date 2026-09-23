import type { MaybeRefOrGetter } from 'vue'
import { loginSchema, registerSchema } from '@nuxt-app/types'
import { computed } from 'vue'
import { useAuthForm } from './useAuthForm'

export type PasswordAuthMode = 'login' | 'register'

// The fields a password screen renders. Structurally compatible with Nuxt UI's
// `AuthFormField`, so this package does not depend on the UI library.
export interface PasswordAuthField {
  name: string
  type: 'email' | 'password' | 'text'
  label: string
  placeholder: string
  required: boolean
}

const loginFields: PasswordAuthField[] = [
  { name: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
  { name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', required: true },
]

const registerFields: PasswordAuthField[] = [
  { name: 'name', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
  { name: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
  { name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', required: true },
]

export interface PasswordAuthScreenOptions<T> {
  mode: PasswordAuthMode
  submit: (data: T) => Promise<void>
  // Where to land after a successful submit. Omit to stay put.
  redirectTo?: MaybeRefOrGetter<string>
  // Shown when a submit fails without a usable message.
  fallbackMessage?: string
}

// The whole submission flow for a login or registration screen: schema, field
// descriptors, single-flight submit, redirect sanitization, and the field
// errors the API error contract produces. Screens spread `screenProps` onto
// `AuthScreen`, so none of them can drop the field errors.
export function usePasswordAuthScreen<T>(options: PasswordAuthScreenOptions<T>) {
  const login = options.mode === 'login'
  const form = useAuthForm<T>({
    submit: options.submit,
    redirectTo: options.redirectTo,
    fallbackMessage: options.fallbackMessage,
  })

  const screenProps = computed(() => ({
    schema: login ? loginSchema : registerSchema,
    fields: login ? loginFields : registerFields,
    loading: form.submitting.value,
    errorMessage: form.errorMessage.value,
    fieldErrors: form.fieldErrors.value,
    submit: form.onSubmit,
  }))

  return { screenProps, ...form }
}
