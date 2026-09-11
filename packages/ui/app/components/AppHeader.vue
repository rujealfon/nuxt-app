<script setup lang="ts">
const { linkTo, currentApp } = useSite()

const links = [
  { key: 'web', label: 'Home' },
  { key: 'app', label: 'App' },
  { key: 'admin', label: 'Admin' },
] as const
</script>

<template>
  <header class="flex items-center justify-between gap-4 border-b border-default px-6 py-4">
    <strong class="text-highlighted">mysite</strong>
    <nav class="flex items-center gap-1">
      <UButton
        v-for="link in links"
        :key="link.key"
        :to="linkTo(link.key)"
        :variant="currentApp === link.key ? 'soft' : 'ghost'"
        :color="currentApp === link.key ? 'primary' : 'neutral'"
        :label="link.label"
        external
      />
      <UColorModeButton />
    </nav>
  </header>
</template>
