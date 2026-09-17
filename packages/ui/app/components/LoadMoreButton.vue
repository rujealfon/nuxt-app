<script setup lang="ts">
const props = withDefaults(defineProps<{
  hasMore: boolean
  loading?: boolean
  label?: string
}>(), {
  loading: false,
  label: 'Load more',
})

defineEmits<{
  (e: 'loadMore'): void
}>()
</script>

<template>
  <UButton
    v-if="props.hasMore"
    :loading="props.loading"
    :label="props.label"
    color="neutral"
    variant="outline"
    @click="$emit('loadMore')"
  />
</template>
