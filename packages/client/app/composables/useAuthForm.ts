import type { MaybeRefOrGetter } from 'vue'
import { ref, toValue } from 'vue'
import { navigateTo } from '#imports'

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
  const submitting = ref(false)

  async function onSubmit(data: T) {
    if (submitting.value) {
      return
    }

    submitting.value = true
    errorMessage.value = ''

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
      errorMessage.value = error instanceof Error && error.message
        ? error.message
        : options.fallbackMessage ?? 'Something went wrong'
    }
    finally {
      submitting.value = false
    }
  }

  return { errorMessage, submitting, onSubmit }
}
