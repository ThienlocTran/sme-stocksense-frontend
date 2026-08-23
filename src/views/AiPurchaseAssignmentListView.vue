<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import EmptyState from "../components/EmptyState.vue";
import {
  listAiPurchaseAssignments,
  retryEmail,
} from "../services/aiPurchaseAssignmentService";
import { canManageAiPurchaseEmails } from "../services/permissionService";

import { useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();

const assignments = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const page = ref(0);
const size = ref(10);
const totalPages = ref(0);
const totalElements = ref(0);
const retrying = ref(null); // id đang retry email

const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);
const canManageEmails = computed(() => canManageAiPurchaseEmails());

const columns = computed(() => [
  { key: "code", label: t("forecast.assignment.codeColumn") || "Nhiệm vụ", class: "cell-medium" },
  { key: "productName", label: t("inventory.columns.productName") || "Sản phẩm", class: "cell-long" },
  { key: "warehouseName", label: t("forecast.assignment.warehouseSupplierColumn") || "Kho / Nhà cung cấp", class: "cell-long" },
  { key: "receiverName", label: t("forecast.assignment.receiverColumn") || "Người phụ trách", class: "cell-medium" },
  { key: "quantities", label: t("forecast.assignment.quantitiesColumn") || "Số lượng", class: "cell-medium text-right" },
  { key: "status", label: t("stockDocument.columns.status") || "Trạng thái", class: "cell-medium" },
  { key: "createdAt", label: t("stockDocument.columns.createdAt") || "Ngày tạo", class: "cell-nowrap" },
  { key: "actions", label: t("stockDocument.columns.actions") || "Thao tác", class: "cell-compact text-right" },
]);

async function fetchAssignments() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const data = await listAiPurchaseAssignments({ page: page.value, size: size.value });
    assignments.value = data.content || [];
    totalPages.value = data.totalPages || 0;
    totalElements.value = data.totalElements || 0;
  } catch (err) {
    errorMessage.value = err.message || "Không thể tải danh sách yêu cầu nhập hàng AI.";
  } finally {
    isLoading.value = false;
  }
}

async function handleRetryEmail(id) {
  retrying.value = id;
  try {
    await retryEmail(id);
    // Làm mới để thấy trạng thái email mới nhất
    await fetchAssignments();
  } catch (err) {
    errorMessage.value = err.message || "Không thể gửi email.";
  } finally {
    retrying.value = null;
  }
}

function previousPage() {
  if (!hasPreviousPage.value) return;
  page.value -= 1;
  fetchAssignments();
}

function nextPage() {
  if (!hasNextPage.value) return;
  page.value += 1;
  fetchAssignments();
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", { hour12: false });
}

function formatQty(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function statusLabel(status) {
  if (status === "DA_GUI") return t("forecast.assignment.status_DA_GUI") || "Đã giao việc";
  if (status === "DA_TIEP_NHAN") return t("forecast.assignment.status_DA_TIEP_NHAN") || "Đã tiếp nhận";
  if (status === "DA_TAO_PHIEU") return t("forecast.assignment.status_DA_TAO_PHIEU") || "Đã tạo phiếu";
  if (status === "DA_HOAN_THANH") return t("forecast.assignment.status_DA_HOAN_THANH") || "Đã hoàn thành";
  if (status === "HUY") return t("forecast.assignment.status_HUY") || "Đã hủy";
  return status || "—";
}

function goDetail(row) {
  router.push("/ai-purchase-assignments/" + row.id);
}

function emailStatusLabel(status) {
  if (status === "DA_GUI") return t("forecast.assignment.emailStatus_DA_GUI") || "Đã gửi";
  if (status === "THAT_BAI") return t("forecast.assignment.emailStatus_THAT_BAI") || "Gửi thất bại";
  if (status === "CHO_GUI") return t("forecast.assignment.emailStatus_CHO_GUI") || "Chờ gửi";
  return status || t("common.unknown") || "Không xác định";
}

function emailStatusClass(status) {
  if (status === "DA_GUI") return "badge-sent";
  if (status === "THAT_BAI") return "badge-failed";
  if (status === "CHO_GUI") return "badge-pending";
  return "badge-pending";
}

onMounted(() => {
  fetchAssignments();
});
</script>

<template>
  <div class="page-container page-shell">
    <PageHeader
      :title="$t('forecast.assignment.pageTitle')"
      :description="$t('forecast.assignment.pageDesc')"
    />

    <!-- Error -->
    <p v-if="errorMessage" class="error-alert card card-pad">
      <i class="mdi mdi-alert-circle text-lg"></i>
      <span>{{ errorMessage }}</span>
    </p>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state card card-pad">
      <i class="mdi mdi-loading mdi-spin text-2xl text-indigo-600"></i>
      <span>{{ $t('common.loading') }}</span>
    </div>

    <!-- Table -->
    <div v-else-if="assignments.length > 0">
      <div class="ai-desktop-table animate-in fade-in duration-200">
        <DataTable :columns="columns" :rows="assignments" min-width="1000px">
          <template #code="{ row }">
            <router-link :to="'/ai-purchase-assignments/' + row.id" class="text-link font-bold text-primary">
              {{ row.code || row.id }}
            </router-link>
          </template>

          <template #productName="{ row }">
            <div class="product-cell flex flex-col max-w-[280px]">
              <span class="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2" :title="row.productName">
                {{ row.productName || '—' }}
              </span>
              <span class="text-[11px] text-zinc-400 mt-0.5 font-mono">
                {{ row.productCode || '—' }}
              </span>
            </div>
          </template>

          <template #warehouseName="{ row }">
            <div class="flex flex-col">
              <span class="font-semibold text-zinc-900 dark:text-zinc-100">
                {{ row.warehouseName || '—' }}
              </span>
              <span class="text-[11px] text-zinc-400 font-mono mt-0.5">
                Code: {{ row.warehouseCode || '—' }}
              </span>
              <span class="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                {{ row.supplierName || t('forecast.assignment.supplierUnknown') }}
              </span>
            </div>
          </template>

          <template #receiverName="{ row }">
            <div class="flex flex-col">
              <span class="font-medium text-zinc-900 dark:text-zinc-100">
                {{ row.receiverName || row.receiverEmail || '—' }}
              </span>
              <span class="text-[11px] text-zinc-400 font-mono mt-0.5" v-if="row.receiverName && row.receiverEmail">
                {{ row.receiverEmail }}
              </span>
            </div>
          </template>

          <template #quantities="{ row }">
            <div class="flex flex-col text-right">
              <strong class="text-zinc-900 dark:text-zinc-100 tabular-num" :title="t('forecast.assignment.reqQty')">
                {{ formatQty(row.requestedQuantity) }}
              </strong>
              <span class="text-[11px] text-indigo-500 dark:text-indigo-400 font-semibold mt-0.5 tabular-num" :title="t('forecast.assignment.aiQty')">
                AI: {{ formatQty(row.aiSuggestedQuantity) }}
              </span>
            </div>
          </template>

          <template #status="{ row }">
            <div class="flex flex-col gap-1 items-start">
              <StatusBadge :status="statusLabel(row.status)" />
              <span class="email-badge-inline text-[10px] mt-0.5" :class="emailStatusClass(row.emailStatus)">
                Email: {{ emailStatusLabel(row.emailStatus) }}
              </span>
            </div>
          </template>

          <template #createdAt="{ value }">
            <span class="tabular-num text-xs text-zinc-500">{{ formatDate(value) }}</span>
          </template>

          <template #actions="{ row }">
            <div class="actions-cell">
              <button
                class="btn btn-secondary btn-sm"
                type="button"
                @click="goDetail(row)"
              >
                {{ t('stockDocument.actionView') }}
              </button>
            </div>
          </template>
        </DataTable>
      </div>

      <!-- Mobile list -->
      <div class="ai-mobile-list animate-in fade-in duration-200">
        <div
          v-for="row in assignments"
          :key="row.id"
          class="assignment-card card card-pad"
        >
          <div class="card-header-row">
            <div>
              <button class="text-link font-bold text-base text-primary" type="button" @click="goDetail(row)">
                {{ row.code || row.id }}
              </button>
              <div class="text-xs text-muted mt-0.5">[{{ row.productCode }}] {{ row.productName || "—" }}</div>
            </div>
            <StatusBadge :status="statusLabel(row.status)" />
          </div>
          <div class="card-body-details">
            <div class="detail-row">
              <span class="detail-label">Kho hàng</span>
              <span class="detail-val">[{{ row.warehouseCode }}] {{ row.warehouseName || "—" }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Nhà cung cấp</span>
              <span class="detail-val">{{ row.supplierName || t('forecast.assignment.supplierUnknown') }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Người phụ trách</span>
              <span class="detail-val text-xs text-right font-medium">{{ row.receiverName || row.receiverEmail || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Số lượng (Yêu cầu / AI)</span>
              <span class="detail-val tabular-num font-bold text-zinc-900 dark:text-zinc-100">
                {{ formatQty(row.requestedQuantity) }} <span class="text-zinc-400 font-normal text-xs">/ AI: {{ formatQty(row.aiSuggestedQuantity) }}</span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Trạng thái email</span>
              <span class="email-badge" :class="emailStatusClass(row.emailStatus)">
                {{ emailStatusLabel(row.emailStatus) }}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Ngày tạo</span>
              <span class="detail-val text-xs text-muted">{{ formatDate(row.createdAt) }}</span>
            </div>
          </div>
          <div class="card-footer-action">
            <button class="btn btn-secondary btn-sm w-full justify-center" type="button" @click="goDetail(row)">
              {{ t('stockDocument.actionView') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination-bar card card-pad">
        <span class="muted">{{ totalElements }} bản ghi</span>
        <div class="pagination-actions">
          <button
            class="btn btn-sm"
            type="button"
            :disabled="!hasPreviousPage || isLoading"
            @click="previousPage"
          >
            <i class="mdi mdi-chevron-left"></i> Trước
          </button>
          <span class="page-indicator">Trang {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span>
          <button
            class="btn btn-sm"
            type="button"
            :disabled="!hasNextPage || isLoading"
            @click="nextPage"
          >
            Sau <i class="mdi mdi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else>
      <EmptyState
        :title="$t('forecast.assignment.emptyTitle')"
        :description="$t('forecast.assignment.emptyDesc')"
        icon="mdi-robot-outline"
      />
    </div>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.error-alert {
  background: var(--color-danger-soft);
  border: 1px solid rgba(220, 38, 38, 0.2);
  color: var(--color-danger);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
}

.email-badge-inline {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.actions-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.email-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.badge-sent {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.badge-failed {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.badge-pending {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.btn-warning {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
  font-weight: 600;
}

.btn-warning:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.2);
}

.btn-warning:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tabular-num {
  font-variant-numeric: tabular-nums;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  gap: 16px;
}

.pagination-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-indicator {
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

/* Mobile */
.ai-mobile-list {
  display: none;
}

@media (max-width: 1023px) {
  .ai-desktop-table {
    display: none;
  }
  .ai-mobile-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }
  .assignment-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 10px;
  }
  .card-body-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }
  .detail-label {
    color: var(--color-text-secondary);
  }
  .detail-val {
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .card-footer-action {
    border-top: 1px solid var(--color-border);
    padding-top: 10px;
  }
}
</style>
