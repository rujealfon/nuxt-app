<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'danger' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
}>(), {
  variant: 'primary',
  type: 'button',
})

const variants = {
  primary: 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-400',
  danger: 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300',
  ghost: 'bg-slate-700 text-white hover:bg-slate-600 disabled:bg-slate-500',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed" :class="[
      variants[variant],
    ]"
  >
    <slot />
  </button>
</template>
