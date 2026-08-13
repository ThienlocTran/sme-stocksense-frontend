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
  background: #f1f5f9;
  color: #475569;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.status-nháp,
.status-đã-hủy,
.status-hủy,
.status-tạm-khóa {
  background: #f1f5f9;
  color: #475569;
  border-color: rgba(148, 163, 184, 0.2);
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
  background: #fff7ed;
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.16);
}

.status-đã-duyệt {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: rgba(37, 99, 235, 0.16);
}

.status-từ-chối,
.status-thiếu-hàng,
.status-cao,
.status-khẩn-cấp,
.status-xuất-kho {
  background: #fef2f2;
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.16);
}

.status-hoàn-thành,
.status-đang-hoạt-động,
.status-đủ-hàng,
.status-thấp,
.status-đang-xử-lý,
.status-đang-bán,
.status-nhập-kho,
.status-đã-chốt {
  background: #ecfdf3;
  color: #15803d;
  border-color: rgba(22, 163, 74, 0.16);
}

.status-tạm-ngưng,
.status-ngừng-hoạt-động,
.status-thừa-hàng {
  background: #e2e8f0;
  color: #334155;
  border-color: rgba(148, 163, 184, 0.2);
}

.status-open {
  background: #fef2f2;
  color: #b91c1c;
}

.status-viewed {
  background: #fff7ed;
  color: #b45309;
}

.status-processed {
  background: #ecfdf3;
  color: #15803d;
}

.severity-critical {
  background: #fef2f2;
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.16);
}

.severity-high {
  background: #fff7ed;
  color: #ea580c;
  border-color: rgba(234, 88, 12, 0.16);
}

.severity-medium {
  background: #fff7ed;
  color: #d97706;
  border-color: rgba(217, 119, 6, 0.16);
}

.severity-low {
  background: #eff6ff;
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.16);
}
</style>
