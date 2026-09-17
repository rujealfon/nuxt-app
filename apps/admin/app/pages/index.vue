<script setup lang="ts">
const { user, signOut } = useAuth()

const isSigningOut = ref(false)

async function handleSignOut() {
  isSigningOut.value = true

  try {
    await signOut()
    await navigateTo('/login')
  }
  finally {
    isSigningOut.value = false
  }
}

useHead({ title: 'Admin · nuxt-app' })
</script>

<template>
  <section class="mx-auto mt-16 max-w-3xl px-6">
    <h1 class="text-2xl font-bold text-highlighted">
      Admin
    </h1>
    <p class="mt-3 text-muted">
      Internal operations console served from admin.nuxt-app.com.
    </p>
    <p v-if="user" class="mt-3 text-default">
      Signed in as <strong>{{ user.email }}</strong>
    </p>
    <UButton
      v-if="user"
      class="mt-6"
      variant="outline"
      color="neutral"
      :loading="isSigningOut"
      label="Sign out"
      @click="handleSignOut"
    />
  </section>
</template>
