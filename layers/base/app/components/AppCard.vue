<script setup lang="ts">
defineProps<{
  dark?: boolean
}>()
</script>

<template>
  <div
    class="rounded-xl p-8" :class="[
      dark ? 'bg-slate-800' : 'bg-white shadow-sm',
    ]"
  >
    <slot />
  </div>
</template>
