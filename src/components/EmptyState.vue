<script setup>
defineProps({
  title: { type: String, default: "Chưa có dữ liệu" },
  description: {
    type: String,
    default: "Thử thay đổi bộ lọc hoặc tạo dữ liệu mới.",
  },
  icon: { type: String, default: "mdi-database-off-outline" },
});
</script>

<template>
  <div class="empty-state card card-pad">
    <div class="empty-state__icon">
      <i class="mdi" :class="icon"></i>
    </div>
    <div class="empty-state__content">
      <strong>{{ title }}</strong>
      <span>{{ description }}</span>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  min-height: 220px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  color: var(--color-text-secondary);
  text-align: center;
  padding: 28px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.empty-state__icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.empty-state__icon i {
  font-size: 24px;
}

.empty-state__content {
  display: grid;
  gap: 4px;
}

.empty-state strong {
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 700;
}

.empty-state span {
  line-height: 1.55;
  max-width: 320px;
}
</style>
