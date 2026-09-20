<script setup lang="ts" generic="T extends Record<string, unknown>">
import type { AuthFormField, FormSchema, FormSubmitEvent } from '@nuxt/ui'

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
}>()

function onSubmit(event: FormSubmitEvent<T>) {
  return props.submit(event.data)
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center px-6">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
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
