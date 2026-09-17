export function useSignOut(options: { onSignedOut?: () => void | Promise<void> } = {}) {
  const { signOut: signOutAction } = useAuth()
  const isSigningOut = ref(false)

  async function signOut() {
    isSigningOut.value = true

    try {
      await signOutAction()
      await options.onSignedOut?.()
    }
    finally {
      isSigningOut.value = false
    }
  }

  return { isSigningOut, signOut }
}
