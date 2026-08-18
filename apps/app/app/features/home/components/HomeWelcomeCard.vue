<script setup lang="ts">
const { user } = useAuth()
</script>

<template>
  <UCard>
    <h2 class="mb-1 text-xl font-semibold">
      Welcome, {{ user?.name }}!
    </h2>
    <p class="mb-6 text-gray-500">
      {{ user?.email }}
    </p>

    <dl class="space-y-3 text-sm">
      <div class="flex justify-between border-b border-gray-100 py-3">
        <dt class="text-gray-500">
          User ID
        </dt>
        <dd class="font-mono">
          {{ user?.id }}
        </dd>
      </div>
      <div class="flex justify-between py-3">
        <dt class="text-gray-500">
          Role
        </dt>
        <dd class="font-medium capitalize">
          {{ user?.role }}
        </dd>
      </div>
    </dl>
  </UCard>
</template>
