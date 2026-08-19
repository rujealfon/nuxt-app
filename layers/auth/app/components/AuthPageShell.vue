<template>
  <div class="relative flex min-h-dvh items-center justify-center p-6">
    <div class="absolute end-4 top-4">
      <UColorModeButton />
    </div>
    <UPageCard class="w-full max-w-md">
      <slot />
    </UPageCard>
  </div>
</template>
