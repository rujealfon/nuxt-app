<script setup lang="ts">
const { actor } = useAuth()
const { isSigningOut, signOut } = useSignOut()

useHead({ title: 'App · nuxt-app' })
</script>

<template>
  <section class="mx-auto mt-16 max-w-2xl px-6">
    <h1 class="text-2xl font-bold text-highlighted">
      Product app
    </h1>
    <p v-if="actor" class="mt-3 text-default">
      Signed in as <strong>{{ actor.email }}</strong>
    </p>
    <div v-else class="mt-3 flex items-center gap-3">
      <p class="text-muted">
        You are not signed in.
      </p>
      <UButton to="/login" variant="outline" color="neutral" label="Sign in" />
    </div>
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
