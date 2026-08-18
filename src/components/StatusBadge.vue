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
.status-đang-kiểm-kê {
  background: #fff9f0;
  color: var(--color-warning);
  border-color: rgba(216, 138, 19, 0.2);
}

.status-đã-duyệt {
  background: #edf4fe;
  color: var(--color-info);
  border-color: rgba(57, 117, 217, 0.2);
}

.status-từ-chối,
.status-thiếu-hàng,
.status-cao,
.status-khẩn-cấp,
.status-xuất-kho {
  background: #fdf2f2;
  color: var(--color-danger);
  border-color: rgba(194, 65, 59, 0.2);
}

.status-hoàn-thành,
.status-đang-hoạt-động,
.status-đủ-hàng,
.status-thấp,
.status-đang-xử-lý,
.status-đang-bán,
.status-nhập-kho,
.status-đã-chốt {
  background: var(--color-primary-soft);
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
  background: #fdf2f2;
  color: var(--color-danger);
  border-color: rgba(194, 65, 59, 0.2);
}

.status-viewed {
  background: #fff9f0;
  color: var(--color-warning);
  border-color: rgba(216, 138, 19, 0.2);
}

.status-processed {
  background: var(--color-primary-soft);
  color: var(--color-success);
  border-color: rgba(22, 130, 93, 0.2);
}

.severity-critical {
  background: #fdf2f2;
  color: var(--color-danger);
  border-color: rgba(194, 65, 59, 0.2);
}

.severity-high {
  background: #fff9f0;
  color: var(--color-warning);
  border-color: rgba(216, 138, 19, 0.2);
}

.severity-medium {
  background: #fff9f0;
  color: var(--color-warning);
  border-color: rgba(216, 138, 19, 0.2);
}

.severity-low {
  background: #edf4fe;
  color: var(--color-info);
  border-color: rgba(57, 117, 217, 0.2);
}
</style>
