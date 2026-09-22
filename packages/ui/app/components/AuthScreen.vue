<script setup lang="ts" generic="T extends Record<string, unknown>">
import type { AuthFormField, FormSchema, FormSubmitEvent } from '@nuxt/ui'
import { useTemplateRef, watch } from 'vue'

interface AuthFieldError {
  name: string
  message: string
}

interface AuthFormInstance {
  formRef?: {
    setErrors: (errors: AuthFieldError[]) => void
  }
}

const props = defineProps<{
  title: string
  description: string
  icon: string
  schema: FormSchema
  fields: AuthFormField[]
  submitLabel: string
  // The form's data type anchors `T`; the screen only forwards the event.
  submit: (data: T) => Promise<void> | void
  loading?: boolean
  errorMessage?: string
  fieldErrors?: AuthFieldError[]
}>()

const authForm = useTemplateRef<AuthFormInstance>('authForm')

// Server field errors are applied to the form on each change. `useAuthForm`
// always replaces the array, so a reference watch is enough.
watch(() => props.fieldErrors, (errors) => {
  authForm.value?.formRef?.setErrors(errors ?? [])
}, { immediate: true })

function onSubmit(event: FormSubmitEvent<T>) {
  return props.submit(event.data)
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center px-6">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        ref="authForm"
        :schema="schema"
        :fields="fields"
        :title="title"
        :description="description"
        :icon="icon"
        :submit="{ label: submitLabel, block: true, loading }"
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
      <slot name="footer" />
    </UPageCard>
  </div>
</template>
