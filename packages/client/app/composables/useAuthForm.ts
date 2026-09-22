import type { MaybeRefOrGetter } from 'vue'
import type { AuthFieldError } from '../lib/authError'
import { ref, toValue } from 'vue'
import { navigateTo } from '#imports'
import { AuthRequestError } from '../lib/authError'

export interface AuthFormOptions<T> {
  submit: (data: T) => Promise<void>
  // Where to land after a successful submit. Omit to stay put.
  redirectTo?: MaybeRefOrGetter<string>
  // Shown when a submit fails without a usable message.
  fallbackMessage?: string
}

// Only same-origin, absolute in-app paths pass; anything else (external,
// protocol-relative, backslash-smuggled) falls back to the app root.
function inAppPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  return normalized.startsWith('/') && !normalized.startsWith('//') ? normalized : '/'
}

// Submission behavior for auth screens: single-flight guard, surfaced failure
// message, and post-success navigation. Kept in the auth layer so the shared
// UI package stays presentational.
export function useAuthForm<T>(options: AuthFormOptions<T>) {
  const errorMessage = ref('')
  const fieldErrors = ref<AuthFieldError[]>([])
  const submitting = ref(false)

  async function onSubmit(data: T) {
    if (submitting.value) {
      return
    }

    submitting.value = true
    errorMessage.value = ''
    fieldErrors.value = []

    try {
      await options.submit(data)

      if (options.redirectTo !== undefined) {
        try {
          await navigateTo(inAppPath(toValue(options.redirectTo)))
        }
        catch {
          errorMessage.value = 'Unable to continue'
        }
      }
    }
    catch (error) {
      // Field recovery is more useful than the catch-all, so only surface a
      // message when there is no field to attach the failure to.
      fieldErrors.value = error instanceof AuthRequestError ? error.fieldErrors : []
      errorMessage.value = fieldErrors.value.length
        ? ''
        : error instanceof Error && error.message
          ? error.message
          : options.fallbackMessage ?? 'Something went wrong'
    }
    finally {
      submitting.value = false
    }
  }

  return { errorMessage, fieldErrors, submitting, onSubmit }
}
