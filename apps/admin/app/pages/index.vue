<script setup lang="ts">
const { actor } = useAuth()
const { isSigningOut, signOut } = useSignOut({
  onSignedOut: () => {
    navigateTo('/login')
  },
})

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
    <p v-if="actor" class="mt-3 text-default">
      Signed in as <strong>{{ actor.email }}</strong>
    </p>
    <UButton
      v-if="actor"
      class="mt-6"
      variant="outline"
      color="neutral"
      :loading="isSigningOut"
      label="Sign out"
      @click="signOut"
    />
  </section>
</template>
