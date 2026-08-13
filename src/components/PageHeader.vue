<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: "" },
});
</script>

<template>
  <div class="between page-header">
    <div class="page-header__content">
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="description" class="page-desc">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 20px;
  align-items: flex-start;
  gap: 16px;
}
.page-header__content {
  display: grid;
  gap: 4px;
}
</style>
