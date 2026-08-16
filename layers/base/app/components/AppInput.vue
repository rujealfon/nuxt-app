<script setup lang="ts">
withDefaults(defineProps<{
  type?: string
  label?: string
  placeholder?: string
  required?: boolean
  minlength?: number
  dark?: boolean
}>(), {
  type: 'text',
})

const model = defineModel<string>({ default: '' })
</script>

<template>
  <label class="block">
    <span
      v-if="label"
      class="mb-1.5 block text-sm font-medium" :class="[dark ? 'text-slate-300' : 'text-gray-800']"
    >
      {{ label }}
    </span>
    <input
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      :minlength="minlength"
      class="w-full rounded-lg px-3 py-2.5 outline-none" :class="[
        dark
          ? 'border border-slate-600 bg-slate-950 text-white'
          : 'border border-gray-300 bg-white text-gray-900',
      ]"
    >
  </label>
</template>
