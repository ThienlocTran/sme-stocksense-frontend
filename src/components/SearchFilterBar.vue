<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Tìm kiếm' },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="filter-bar card card-pad">
    <input class="input search-input" :value="modelValue" :placeholder="placeholder" @input="$emit('update:modelValue', $event.target.value)" />
    <slot />
  </div>
</template>

<style scoped>
.filter-bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
.search-input { min-width: 260px; flex: 1; }
.filter-bar :deep(.select), .filter-bar :deep(.input) { max-width: 240px; }
@media (max-width: 720px) { .filter-bar, .search-input { width: 100%; max-width: none; } .filter-bar :deep(.select), .filter-bar :deep(.input) { max-width: none; } }
</style>
