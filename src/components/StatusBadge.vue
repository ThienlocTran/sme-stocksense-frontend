<script setup>
import { computed } from "vue";

const props = defineProps({
  status: { type: String, required: true },
  variant: { type: String, default: "status" },
});

const badgeClass = computed(() => {
  const normalized = props.status
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll("/", "");
  return props.variant === "severity"
    ? `severity-${normalized}`
    : `status-${normalized}`;
});
</script>

<template>
  <span class="badge" :class="badgeClass">{{ status }}</span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.01em;
  background: var(--color-bg);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  box-shadow: none;
}

.status-nháp,
.status-đã-hủy,
.status-hủy,
.status-tạm-khóa {
  background: var(--color-bg);
  color: var(--color-text-secondary);
  border-color: var(--color-border-strong);
}

.status-chờ-duyệt,
.status-chờ-duyệt-cấp-1,
.status-chờ-duyệt-cấp-2,
.status-sắp-hết,
.status-trung-bình,
.status-chưa-xử-lý,
.status-nhập-đầu-kỳ,
.status-điều-chỉnh-tăng,
.status-điều-chỉnh-giảm,
.status-đang-kiểm-kê,
.status-đã-tiếp-nhận {
  background: var(--color-warning-soft);
  color: var(--color-warning);
  border-color: rgba(217, 119, 6, 0.2);
}

.status-đã-duyệt,
.status-đã-giao-việc {
  background: var(--color-info-soft);
  color: var(--color-info);
  border-color: rgba(2, 132, 199, 0.2);
}

.status-từ-chối,
.status-thiếu-hàng,
.status-hết-hàng,
.status-cao,
.status-khẩn-cấp,
.status-xuất-kho {
  background: var(--color-danger-soft);
  color: var(--color-danger);
  border-color: rgba(220, 38, 38, 0.2);
}

.status-hoàn-thành,
.status-đang-hoạt-động,
.status-đủ-hàng,
.status-thấp,
.status-đang-xử-lý,
.status-đang-bán,
.status-nhập-kho,
.status-đã-chốt,
.status-đã-tạo-phiếu {
  background: var(--color-success-soft);
  color: var(--color-success);
  border-color: rgba(22, 130, 93, 0.2);
}

.status-tạm-ngưng,
.status-ngừng-hoạt-động,
.status-thừa-hàng {
  background: var(--color-bg);
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.status-open {
  background: var(--color-danger-soft);
  color: var(--color-danger);
  border-color: rgba(220, 38, 38, 0.2);
}

.status-viewed {
  background: var(--color-warning-soft);
  color: var(--color-warning);
  border-color: rgba(217, 119, 6, 0.2);
}

.status-processed {
  background: var(--color-success-soft);
  color: var(--color-success);
  border-color: rgba(22, 130, 93, 0.2);
}

.severity-critical {
  background: var(--color-danger-soft);
  color: var(--color-danger);
  border-color: rgba(220, 38, 38, 0.2);
}

.severity-warning {
  background: var(--color-warning-soft);
  color: var(--color-warning);
  border-color: rgba(217, 119, 6, 0.2);
}

.severity-high {
  background: var(--color-warning-soft);
  color: var(--color-warning);
  border-color: rgba(217, 119, 6, 0.2);
}

.severity-medium {
  background: var(--color-warning-soft);
  color: var(--color-warning);
  border-color: rgba(217, 119, 6, 0.2);
}

.severity-low {
  background: var(--color-info-soft);
  color: var(--color-info);
  border-color: rgba(2, 132, 199, 0.2);
}
</style>
