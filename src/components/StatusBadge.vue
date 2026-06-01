<script setup>
defineProps({ status: { type: String, required: true } })
</script>

<template>
  <span class="badge" :class="`status-${status.toLowerCase().replaceAll(' ', '-').replaceAll('/', '')}`">{{ status }}</span>
</template>

<style scoped>
.badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 9px; font-size: 12px; font-weight: 800; white-space: nowrap; background: #f1f5f9; color: #475569; }
.status-nháp, .status-đã-hủy, .status-tạm-khóa { background: #f1f5f9; color: #475569; }
.status-chờ-duyệt, .status-sắp-hết, .status-trung-bình, .status-chưa-xử-lý { background: #fef3c7; color: #b45309; }
.status-đã-duyệt { background: #dbeafe; color: #1d4ed8; }
.status-từ-chối, .status-thiếu-hàng, .status-cao, .status-khẩn-cấp { background: #fee2e2; color: #b91c1c; }
.status-hoàn-thành, .status-đang-hoạt-động, .status-đủ-hàng, .status-thấp, .status-đang-xử-lý, .status-đang-bán { background: #dcfce7; color: #15803d; }
.status-tạm-ngưng { background: #e2e8f0; color: #334155; }
</style>
