<script setup lang="ts" generic="T extends Record<string, unknown>">
import type { AuthFormField, FormSchema, FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  title: string
  description: string
  icon: string
  schema: FormSchema
  fields: AuthFormField[]
  submitLabel: string
  failureMessage: string
  redirectTo: string
  submitAction: (data: T) => Promise<void>
}>()

const errorMessage = ref('')
const submitting = ref(false)

function inAppPath(path: string): string {
  return path.startsWith('/') && !path.startsWith('//') ? path : '/'
}

async function onSubmit(event: FormSubmitEvent<T>) {
  if (submitting.value) {
    return
  }

  submitting.value = true
  errorMessage.value = ''

  try {
    await props.submitAction(event.data)

    try {
      await navigateTo(inAppPath(props.redirectTo))
    }
    catch {
      errorMessage.value = 'Unable to continue'
    }
  }
  catch {
    errorMessage.value = props.failureMessage
  }
  finally {
    submitting.value = false
  }
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
        :submit="{ label: submitLabel, block: true, loading: submitting }"
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
