<script setup>
import { onMounted, ref } from "vue";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import EmptyState from "../components/EmptyState.vue";
import { getLowStockInventory } from "../services/inventoryService";

const isLoading = ref(false);
const errorMessage = ref("");
const alertItems = ref([]);
const totalElements = ref(0);
const totalPages = ref(0);

const columns = [
  { key: "product", label: "Product", class: "cell-long" },
  { key: "warehouse", label: "Warehouse", class: "cell-medium" },
  { key: "currentQuantity", label: "Current Stock", class: "cell-compact" },
  { key: "minStock", label: "Minimum Stock", class: "cell-compact" },
  { key: "severity", label: "Severity", class: "cell-nowrap" },
];

onMounted(() => {
  fetchAlerts();
});

async function fetchAlerts() {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const data = await getLowStockInventory({ page: 0, size: 50 });
    alertItems.value = Array.isArray(data?.content) ? data.content : [];
    totalElements.value = Number(data?.totalElements || 0);
    totalPages.value = Number(data?.totalPages || 0);
  } catch (error) {
    alertItems.value = [];
    errorMessage.value = error?.message || "Không thể tải danh sách cảnh báo.";
  } finally {
    isLoading.value = false;
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
  return row.warehouse || row.warehouseCode || "-";
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
    <span class="muted"
      >Trang {{ totalPages === 0 ? 0 : 1 }}/{{ totalPages }}</span
    >
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
}
</style>
