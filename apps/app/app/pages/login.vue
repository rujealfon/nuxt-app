<script setup lang="ts">
import { useHead } from '#imports'
import { LoginScreen } from '~/features/auth'

useHead({ title: 'Sign in · nuxt-app' })
</script>

<template>
  <LoginScreen />
</template>
