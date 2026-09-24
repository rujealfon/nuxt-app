import { ref } from 'vue'
import { navigateTo, useAuth } from '#imports'

// Sign-out state and post-sign-out navigation for account pages. Navigation
// runs only after a successful revoke; a failed revoke leaves the page in
// place so the caller can report it.
export function useSignOut(redirectTo?: string) {
  const { signOut: revoke } = useAuth()
  const isSigningOut = ref(false)

  async function signOut() {
    isSigningOut.value = true

    try {
      await revoke()

      if (redirectTo) {
        await navigateTo(redirectTo)
      }
    }
    finally {
      isSigningOut.value = false
    }
  }

  return { signOut, isSigningOut }
}
