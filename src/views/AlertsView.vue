<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import EmptyState from "../components/EmptyState.vue";
import { getLowStockInventory } from "../services/inventoryService";

const router = useRouter();

const isLoading = ref(false);
const errorMessage = ref("");
const alertItems = ref([]);
const totalElements = ref(0);
const totalPages = ref(0);
const currentPage = ref(0);
const pageSize = 50;

const hasPreviousPage = computed(() => currentPage.value > 0);
const hasNextPage = computed(() => currentPage.value + 1 < totalPages.value);

const columns = [
  { key: "product", label: "Product", class: "cell-long" },
  { key: "warehouse", label: "Warehouse", class: "cell-medium" },
  { key: "currentQuantity", label: "Current Stock", class: "cell-compact" },
  { key: "minStock", label: "Minimum Stock", class: "cell-compact" },
  { key: "severity", label: "Severity", class: "cell-nowrap" },
];

onMounted(() => {
  // prevent unhandled rejection on initial load; fetchAlerts manages errorMessage
  fetchAlerts().catch(() => {});
});

async function fetchAlerts(page = currentPage.value) {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const data = await getLowStockInventory({
      page,
      size: pageSize,
    });
    alertItems.value = Array.isArray(data?.content) ? data.content : [];
    totalElements.value = Number(data?.totalElements || 0);
    totalPages.value = Number(data?.totalPages || 0);
    return data;
  } catch (error) {
    if (error?.status === 401) {
      router.replace("/login");
      throw error;
    }

    errorMessage.value = error?.message || "Không thể tải danh sách cảnh báo.";
    throw error;
  } finally {
    isLoading.value = false;
  }
}

async function goToPreviousPage() {
  if (!hasPreviousPage.value) return;

  const targetPage = currentPage.value - 1;
  try {
    await fetchAlerts(targetPage);
    currentPage.value = targetPage;
  } catch (error) {
    // keep current page unchanged when the request fails
  }
}

async function goToNextPage() {
  if (!hasNextPage.value) return;

  const targetPage = currentPage.value + 1;
  try {
    await fetchAlerts(targetPage);
    currentPage.value = targetPage;
  } catch (error) {
    // keep current page unchanged when the request fails
  }
}

function displayProductName(row) {
  if (!row) return "-";
  if (row.productCode && row.productName) {
    return `${row.productCode} - ${row.productName}`;
  }
  return row.productName || row.productCode || "-";
}

function displayWarehouseName(row) {
  if (!row) return "-";
  if (row.warehouseCode && row.warehouse) {
    return `${row.warehouseCode} - ${row.warehouse}`;
  }
  return row.warehouse || row.warehouseName || row.warehouseCode || "-";
}

function displaySeverity(row) {
  if (!row) return "-";
  return row.severity || row.status || row.stockStatus || "-";
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}
</script>

<template>
  <PageHeader
    title="Cảnh báo tồn kho"
    description="Danh sách sản phẩm đang ở mức cảnh báo từ backend."
  />

  <p v-if="errorMessage" class="form-alert form-alert-error">
    {{ errorMessage }}
  </p>

  <div v-if="isLoading" class="inventory-loading card card-pad">
    <i class="mdi mdi-loading mdi-spin"></i>
    <span>Đang tải danh sách cảnh báo...</span>
  </div>

  <DataTable
    v-else-if="alertItems.length > 0"
    :columns="columns"
    :rows="alertItems"
    min-width="900px"
    empty-text="Không có cảnh báo tồn kho"
  >
    <template #product="{ row }">{{ displayProductName(row) }}</template>
    <template #warehouse="{ row }">{{ displayWarehouseName(row) }}</template>
    <template #currentQuantity="{ value }">{{ formatNumber(value) }}</template>
    <template #minStock="{ value }">{{ formatNumber(value) }}</template>
    <template #severity="{ row }">
      <span class="severity-pill">{{ displaySeverity(row) }}</span>
    </template>
  </DataTable>

  <EmptyState
    v-else-if="!isLoading && !errorMessage"
    title="Không có cảnh báo"
    description="Hiện tại không có mặt hàng nào ở ngưỡng cảnh báo."
  />

  <div v-if="alertItems.length > 0" class="summary-bar card card-pad">
    <span class="muted">{{ totalElements }} cảnh báo</span>
    <div class="pagination-actions">
      <button
        class="pagination-button"
        type="button"
        :disabled="!hasPreviousPage || isLoading"
        @click="goToPreviousPage"
      >
        Trước
      </button>
      <span class="muted"
        >Trang {{ totalPages === 0 ? 0 : currentPage + 1 }}/{{
          totalPages
        }}</span
      >
      <button
        class="pagination-button"
        type="button"
        :disabled="!hasNextPage || isLoading"
        @click="goToNextPage"
      >
        Sau
      </button>
    </div>
  </div>
</template>

<style scoped>
.form-alert {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 8px;
  line-height: 20px;
}

.form-alert-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.inventory-loading {
  min-height: 180px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: var(--muted);
  font-weight: 700;
}

.mdi-spin {
  animation: spin 0.8s linear infinite;
}

.summary-bar {
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
  flex-wrap: wrap;
}

.pagination-button {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  padding: 6px 10px;
  color: var(--text);
  cursor: pointer;
}

.pagination-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.severity-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
  font-size: 13px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .summary-bar {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .pagination-actions {
    justify-content: center;
  }
}
</style>
