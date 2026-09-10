<script setup lang="ts">
const { user, logout } = useAuth()
const { mutate: signOut, isLoading: isSigningOut } = logout

useHead({ title: 'App · mysite' })
</script>

<template>
  <section class="dashboard">
    <h1>Product app</h1>
    <p v-if="user">
      Signed in as <strong>{{ user.email }}</strong>
    </p>
    <p v-else>
      You are not signed in.
    </p>
    <AppButton v-if="user" variant="secondary" :disabled="isSigningOut" @click="signOut()">
      Sign out
    </AppButton>
  </section>
</template>

<style scoped>
.dashboard {
  max-width: 40rem;
  margin: 4rem auto;
  padding: 0 1.5rem;
}
</style>
