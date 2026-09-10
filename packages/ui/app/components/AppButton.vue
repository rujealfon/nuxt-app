<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    type?: 'button' | 'submit'
  }>(),
  {
    variant: 'primary',
    type: 'button',
  },
)
</script>

<template>
  <button :type="type" class="app-button" :data-variant="variant">
    <slot />
  </button>
</template>

<style scoped>
.app-button {
  border: 1px solid transparent;
  border-radius: 0.5rem;
  padding: 0.55rem 1rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.app-button[data-variant='primary'] {
  background: #111827;
  color: #fff;
}
.app-button[data-variant='secondary'] {
  background: #fff;
  color: #111827;
  border-color: #d1d5db;
}
.app-button[data-variant='ghost'] {
  background: transparent;
  color: #111827;
}
</style>
