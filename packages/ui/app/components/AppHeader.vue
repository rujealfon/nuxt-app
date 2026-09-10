<script setup lang="ts">
const { linkTo, currentApp } = useSite()

const links = [
  { key: 'web', label: 'Home' },
  { key: 'app', label: 'App' },
  { key: 'admin', label: 'Admin' },
] as const
</script>

<template>
  <header class="app-header">
    <strong>mysite</strong>
    <nav>
      <a
        v-for="link in links"
        :key="link.key"
        :href="linkTo(link.key)"
        :data-active="currentApp === link.key"
      >
        {{ link.label }}
      </a>
    </nav>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}
.app-header nav {
  display: flex;
  gap: 1rem;
}
.app-header a {
  color: #374151;
  text-decoration: none;
}
.app-header a[data-active='true'] {
  color: #111827;
  font-weight: 700;
}
</style>
