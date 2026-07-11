<script setup>
import { computed, ref, watch } from "vue";
import { useAuthStore } from "../stores/auth";
import { approveExportReceipt, getPendingExportApprovalDetail } from "../services/stockOutApprovalService";
import EmptyState from "./EmptyState.vue";

const props = defineProps({
  receiptId: {
    type: [String, Number],
    required: true,
  },
});

const authStore = useAuthStore();
const receipt = ref(null);
const loading = ref(false);
const error = ref("");
const actionMessage = ref("");
const actionError = ref("");
const actionLoading = ref(false);

const canManageApproval = computed(() =>
  ["ADMIN", "MANAGER"].includes(authStore.currentRole),
);

const canApprove = computed(() => {
  return (
    canManageApproval.value &&
    !actionLoading.value &&
    receipt.value &&
    receipt.value.status === "CHO_DUYET"
  );
});

const overstockItems = computed(() => {
  return (receipt.value?.items || []).filter((item) => {
    const exportQuantity = Number(item.exportQuantity || 0);
    const currentStock = Number(item.currentStock || 0);
    return exportQuantity > currentStock;
  });
});

async function loadDetail() {
  if (!props.receiptId) {
    receipt.value = null;
    error.value = "";
    return;
  }

  loading.value = true;
  error.value = "";
  receipt.value = null;

  try {
    receipt.value = await getPendingExportApprovalDetail(String(props.receiptId));
  } catch (err) {
    error.value = err.message || "Không thể tải chi tiết phiếu xuất.";
  } finally {
    loading.value = false;
  }
}

async function handleApprove() {
  if (!canApprove.value) return;

  const confirmed = window.confirm(
    `Duyệt phiếu ${receipt.value?.code || props.receiptId} này?`,
  );
  if (!confirmed) return;

  actionLoading.value = true;
  actionMessage.value = "";
  actionError.value = "";

  try {
    await approveExportReceipt(String(props.receiptId));
    await loadDetail();
    actionMessage.value = `Đã gửi duyệt thành công cho phiếu ${receipt.value?.code || props.receiptId}.`;
  } catch (err) {
    actionError.value = err.message || "Không thể duyệt phiếu xuất.";
  } finally {
    actionLoading.value = false;
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(status) {
  const statusMap = {
    CHO_DUYET: "Chờ duyệt",
    DA_DUYET: "Đã duyệt",
    TU_CHOI: "Từ chối",
    DA_HUY: "Đã hủy",
  };
  return statusMap[status] || status || "-";
}

function approveButtonLabel() {
  if (actionLoading.value) return "Đang duyệt...";
  if (receipt.value?.approvalLevelLabel) return `Duyệt ${receipt.value.approvalLevelLabel.toLowerCase()}`;
  return "Duyệt";
}

watch(() => props.receiptId, () => {
  actionMessage.value = "";
  actionError.value = "";
  loadDetail();
}, { immediate: true });
</script>

<template>
  <div v-if="loading" class="card card-pad muted">
    Đang tải chi tiết phiếu xuất...
  </div>

  <div v-else-if="error" class="card card-pad error-card">
    <div class="error-title">Không thể tải chi tiết phiếu xuất</div>
    <div class="error-message">{{ error }}</div>
  </div>

  <div v-else-if="!receipt" class="card card-pad">
    <EmptyState
      title="Không có dữ liệu phiếu xuất"
      description="Phiếu xuất không tồn tại hoặc chưa được cung cấp cho giao diện này."
    />
  </div>

  <div v-else class="stack">
    <div class="card card-pad">
      <div class="between">
        <div>
          <h3 class="section-title">Thông tin chung</h3>
          <p class="muted">
            Kiểm tra toàn bộ thông tin trước khi quyết định duyệt hoặc từ chối.
          </p>
        </div>
        <span class="status-pill">{{ formatStatus(receipt.status) }}</span>
      </div>

      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Mã phiếu</span>
          <span class="detail-value">{{ receipt.code || "-" }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Người tạo</span>
          <span class="detail-value">{{ receipt.createdByName || "-" }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Ngày tạo</span>
          <span class="detail-value">{{ formatDate(receipt.createdAt) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Ngày gửi</span>
          <span class="detail-value">{{
            formatDate(receipt.submittedAt)
          }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Kho xuất</span>
          <span class="detail-value">{{ receipt.warehouseName || "-" }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Cấp duyệt</span>
          <span class="detail-value">{{
            receipt.approvalLevelLabel || "-"
          }}</span>
        </div>
      </div>
    </div>

    <div class="card card-pad">
      <div class="between">
        <div>
          <h3 class="section-title">Danh sách sản phẩm</h3>
          <p class="muted">
            Hiển thị số lượng xuất và tồn hiện tại của từng sản phẩm.
          </p>
        </div>
        <span v-if="overstockItems.length" class="warning-pill">
          <i class="mdi mdi-alert-outline"></i>
          Có {{ overstockItems.length }} mặt hàng vượt tồn
        </span>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Mã sản phẩm</th>
              <th>Tên sản phẩm</th>
              <th>Đơn vị</th>
              <th>Số lượng xuất</th>
              <th>Tồn hiện tại</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in receipt.items"
              :key="item.productId || item.productCode"
              :class="{
                'warning-row':
                  Number(item.exportQuantity || 0) >
                  Number(item.currentStock || 0),
              }"
            >
              <td>
                <div class="product-code">{{ item.productCode || "-" }}</div>
              </td>
              <td>
                <div class="product-name">{{ item.productName || "-" }}</div>
              </td>
              <td>{{ item.unitName || "-" }}</td>
              <td class="quantity-cell">
                <span>{{ item.exportQuantity ?? "-" }}</span>
              </td>
              <td class="quantity-cell">
                <span>{{ item.currentStock ?? "-" }}</span>
                <i
                  v-if="
                    Number(item.exportQuantity || 0) >
                    Number(item.currentStock || 0)
                  "
                  class="mdi mdi-alert-circle-outline warning-icon"
                ></i>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card card-pad">
      <div class="between">
        <div>
          <h3 class="section-title">Hành động</h3>
          <p class="muted">
            Duyệt phiếu tại cấp hiện tại và cập nhật lại dữ liệu sau khi thành công.
          </p>
        </div>
      </div>

      <div v-if="actionMessage" class="action-success">
        {{ actionMessage }}
      </div>
      <div v-if="actionError" class="action-error">
        {{ actionError }}
      </div>

      <div class="actions-row">
        <button
          class="btn btn-primary"
          type="button"
          :disabled="!canApprove"
          @click="handleApprove"
        >
          {{ approveButtonLabel() }}
        </button>
        <button
          class="btn btn-danger"
          type="button"
          :disabled="true"
        >
          Từ chối
        </button>
      </div>

      <p v-if="!canManageApproval" class="muted mt-2">
        Bạn hiện không có quyền thực hiện hành động này.
      </p>
    </div>
  </div>
</template>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
}

.detail-label {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.detail-value {
  font-weight: 700;
  color: var(--text);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 700;
}

.warning-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #fef2f2;
  color: var(--danger);
  font-weight: 700;
}

.error-card {
  border-color: #fecaca;
  background: #fff5f5;
}

.error-title {
  color: var(--danger);
  font-weight: 700;
}

.error-message {
  margin-top: 4px;
  color: var(--danger);
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
  margin-top: 16px;
}

.warning-row {
  background: #fef2f2;
}

.quantity-cell {
  font-weight: 700;
  color: var(--text);
}

.product-code {
  color: var(--muted);
  font-size: 12px;
}

.product-name {
  font-weight: 700;
}

.warning-icon {
  margin-left: 6px;
  color: var(--danger);
}

.actions-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.mt-2 {
  margin-top: 8px;
}

@media (max-width: 767px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
