<script setup>
import { useAttrs } from "vue";

defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Tìm kiếm" },
});
defineEmits(["update:modelValue"]);
const attrs = useAttrs();
</script>

<template>
  <div class="filter-bar card card-pad">
    <input
      v-bind="attrs"
      class="input search-input"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <slot />
  </div>
</template>

<style scoped>
.filter-bar {
  display: grid;
  grid-template-columns: minmax(280px, 1.3fr) repeat(auto-fit, minmax(180px, 240px));
  gap: 12px;
  align-items: end;
  margin-bottom: 16px;
}

.search-input {
  min-width: 0;
}

.filter-bar :deep(.select),
.filter-bar :deep(.input) {
  max-width: none;
}

@media (max-width: 720px) {
  .filter-bar {
    grid-template-columns: 1fr;
  }
}
</style>
