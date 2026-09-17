<script setup lang="ts">
const props = withDefaults(defineProps<{
  page: number
  total: number
  pageSize?: number
  loading?: boolean
  disabled?: boolean
}>(), {
  pageSize: 20,
  loading: false,
  disabled: false,
})

defineEmits<{
  (e: 'update:page', page: number): void
}>()
</script>

<template>
  <UPagination
    :page="props.page"
    :total="props.total"
    :items-per-page="props.pageSize"
    :disabled="props.disabled || props.loading"
    @update:page="$emit('update:page', $event)"
  />
</template>
