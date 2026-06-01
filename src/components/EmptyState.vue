<script setup>
defineProps({
  title: { type: String, default: 'Chưa có dữ liệu' },
  description: { type: String, default: 'Thử thay đổi bộ lọc hoặc tạo dữ liệu mới.' },
  icon: { type: String, default: 'mdi-database-off-outline' },
})
</script>

<template>
  <div class="empty-state card card-pad">
    <i class="mdi" :class="icon"></i>
    <strong>{{ title }}</strong>
    <span>{{ description }}</span>
  </div>
</template>

<style scoped>
.empty-state { min-height: 180px; display: grid; place-items: center; align-content: center; gap: 8px; color: var(--muted); text-align: center; }
.empty-state i { font-size: 36px; color: #94a3b8; }
.empty-state strong { color: var(--text); font-size: 16px; }
</style>
