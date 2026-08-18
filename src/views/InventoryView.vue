<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { getInventory } from "../services/inventoryService";
import { getWarehouses } from "../services/warehouseService";
import { getWarehouseStatusLabel } from "../constants/warehouseOptions";

const router = useRouter();
const route = useRoute();
const inventoryItems = ref([]);
const warehouses = ref([]);
const isLoading = ref(false);
const isLoadingDropdowns = ref(false);
const errorMessage = ref("");
const searchDraft = ref("");
const page = ref(0);
const size = ref(20);
const totalPages = ref(0);
const totalElements = ref(0);
const filters = reactive({
  warehouseId: route.query.warehouseId ? String(route.query.warehouseId) : "",
  stockStatus: "",
  warehouseStatus: "",
  productStatus: "",
});

const inventoryStatusOptions = [
  { value: "OUT_OF_STOCK", label: "Hết hàng" },
  { value: "LOW_STOCK", label: "Sắp hết" },
  { value: "NORMAL", label: "Đủ hàng" },
  { value: "OVER_STOCK", label: "Thừa hàng" },
];

const columns = [
  { key: "productCode", label: "Mã SP", class: "cell-compact" },
  { key: "productName", label: "Sản phẩm", class: "cell-long" },
  { key: "warehouse", label: "Kho hàng", class: "cell-medium" },
  { key: "currentQuantity", label: "Tồn thực tế / Tối thiểu", class: "cell-medium text-right" },
  { key: "status", label: "Trạng thái tồn", class: "cell-nowrap" },
  { key: "warehouseStatus", label: "Trạng thái kho", class: "cell-nowrap" },
  { key: "productStatus", label: "Trạng thái SP", class: "cell-nowrap" },
  { key: "lastUpdatedAt", label: "Cập nhật", class: "cell-nowrap" },
];

const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);
const hasActiveFilters = computed(() => {
  return (
    searchDraft.value.trim() !== "" ||
    filters.warehouseId !== "" ||
    filters.stockStatus !== "" ||
    filters.warehouseStatus !== "" ||
    filters.productStatus !== ""
  );
});

onMounted(async () => {
  await loadDropdowns();
  fetchInventory();
});

async function loadDropdowns() {
  isLoadingDropdowns.value = true;
  errorMessage.value = "";
  try {
    const warehouseData = await getWarehouses({ status: "HOAT_DONG" });
    warehouses.value = warehouseData || [];
  } catch (error) {
    errorMessage.value = error.message;
    if (error.status === 401) router.replace("/login");
  } finally {
    isLoadingDropdowns.value = false;
  }
}

async function fetchInventory() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const data = await getInventory({
      page: page.value,
      size: size.value,
      keyword: searchDraft.value.trim(),
      warehouseId: filters.warehouseId,
      stockStatus: filters.stockStatus,
      warehouseStatus: filters.warehouseStatus,
      productStatus: filters.productStatus,
    });

    inventoryItems.value = data.content || [];
    totalPages.value = data.totalPages || 0;
    totalElements.value = data.totalElements || 0;
  } catch (error) {
    inventoryItems.value = [];
    errorMessage.value = error.message;
    if (error.status === 401) router.replace("/login");
  } finally {
    isLoading.value = false;
  }
}

function applySearch() {
  page.value = 0;
  fetchInventory();
}

function applyFilter() {
  page.value = 0;
  fetchInventory();
}

function clearFilters() {
  searchDraft.value = "";
  filters.warehouseId = "";
  filters.stockStatus = "";
  filters.warehouseStatus = "";
  filters.productStatus = "";
  page.value = 0;
  fetchInventory();
}

function getInventoryStatusLabel(status) {
  return inventoryStatusOptions.find((option) => option.value === status)?.label || status || "-";
}

function displayWarehouseName(row) {
  return row.warehouseCode ? `${row.warehouseCode} - ${row.warehouse}` : row.warehouse || "-";
}

function displayWarehouseOption(warehouse) {
  const code = warehouse.maKho || warehouse.code;
  const name = warehouse.tenKho || warehouse.name;
  return code ? `${code} - ${name || "-"}` : name || "-";
}

function previousPage() {
  if (!hasPreviousPage.value) return;
  page.value -= 1;
  fetchInventory();
}

function nextPage() {
  if (!hasNextPage.value) return;
  page.value += 1;
  fetchInventory();
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", { hour12: false });
}
</script>

<template>
  <PageHeader title="Tồn kho" description="Danh sách tồn kho theo sản phẩm và kho." />

  <!-- Inventory Summary Metrics -->
  <div v-if="!isLoading && inventoryItems.length > 0" class="inventory-summary">
    <div class="summary-card card card-pad">
      <span class="summary-label">Tổng bản ghi tồn kho</span>
      <strong class="summary-val text-blue-600">{{ totalElements }}</strong>
    </div>
    <div class="summary-card card card-pad">
      <span class="summary-label">Bản ghi trên trang</span>
      <strong class="summary-val">{{ inventoryItems.length }}</strong>
    </div>
    <div class="summary-card card card-pad">
      <span class="summary-label">Kho hàng đang theo dõi</span>
      <strong class="summary-val text-emerald-600">{{ warehouses.length }}</strong>
    </div>
  </div>

  <SearchFilterBar
    v-model="searchDraft"
    placeholder="Tìm theo mã sản phẩm, tên sản phẩm, mã vạch"
    @keyup.enter="applySearch"
  >
    <select v-model="filters.warehouseId" class="select" :disabled="isLoadingDropdowns || isLoading" @change="applyFilter">
      <option value="">{{ isLoadingDropdowns ? "Đang tải kho..." : "Tất cả kho" }}</option>
      <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
        {{ displayWarehouseOption(warehouse) }}
      </option>
    </select>

    <select v-model="filters.stockStatus" class="select" :disabled="isLoading" @change="applyFilter">
      <option value="">Tất cả trạng thái tồn</option>
      <option v-for="option in inventoryStatusOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <select v-model="filters.warehouseStatus" class="select" :disabled="isLoading" @change="applyFilter">
      <option value="">Tất cả trạng thái kho</option>
      <option value="HOAT_DONG">Đang hoạt động</option>
      <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
    </select>

    <select v-model="filters.productStatus" class="select" :disabled="isLoading" @change="applyFilter">
      <option value="">Tất cả trạng thái SP</option>
      <option value="HOAT_DONG">Đang hoạt động</option>
      <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
    </select>

    <div class="filter-actions">
      <button class="btn btn-primary" type="button" :disabled="isLoading" @click="applySearch">
        <i class="mdi mdi-magnify"></i>
        Tìm kiếm
      </button>
      <button v-if="hasActiveFilters" class="btn btn-ghost" type="button" :disabled="isLoading" @click="clearFilters">
        <i class="mdi mdi-filter-remove-outline"></i>
        Xóa lọc
      </button>
    </div>
  </SearchFilterBar>

  <p v-if="errorMessage" class="form-alert form-alert-error">{{ errorMessage }}</p>

  <div v-if="isLoading" class="inventory-loading card card-pad">
    <i class="mdi mdi-loading mdi-spin"></i>
    <span>Đang tải dữ liệu tồn kho...</span>
  </div>

  <div class="inventory-desktop-table">
    <DataTable
      v-if="inventoryItems.length > 0"
      :columns="columns"
      :rows="inventoryItems"
      min-width="1200px"
      empty-text="Không có dữ liệu tồn kho phù hợp"
    >
      <template #productCode="{ value }">
        <code class="sku-code">{{ value }}</code>
      </template>
      <template #productName="{ row }">
        <div class="product-cell">
          <div class="product-thumbnail">
            <i class="mdi mdi-package-variant-closed"></i>
          </div>
          <div class="product-info">
            <span class="product-name">{{ row.productName }}</span>
            <span class="product-sub" v-if="row.barcode">Barcode: {{ row.barcode }}</span>
          </div>
        </div>
      </template>
      <template #warehouse="{ row }">
        <div class="warehouse-cell">
          <span class="warehouse-name">{{ row.warehouse }}</span>
          <code class="sku-code text-muted text-xs" v-if="row.warehouseCode">{{ row.warehouseCode }}</code>
        </div>
      </template>
      <template #currentQuantity="{ value, row }">
        <div class="quantity-cell">
          <span class="tabular-num font-semibold text-slate-800" :class="{ 'text-red-600 font-bold': row.status === 'OUT_OF_STOCK', 'text-amber-600 font-bold': row.status === 'LOW_STOCK' }">
            {{ value ?? 0 }}
          </span>
          <span class="threshold-hint" v-if="row.minStock !== null">/ tối thiểu {{ row.minStock }}</span>
        </div>
      </template>
      <template #status="{ value }">
        <StatusBadge :status="getInventoryStatusLabel(value)" />
      </template>
      <template #warehouseStatus="{ value }">
        <StatusBadge :status="getWarehouseStatusLabel(value)" />
      </template>
      <template #productStatus="{ value }">
        <StatusBadge :status="value === 'HOAT_DONG' ? 'Đang hoạt động' : 'Ngừng hoạt động'" />
      </template>
      <template #lastUpdatedAt="{ value }">
        <span class="tabular-num text-xs">{{ formatDate(value) }}</span>
      </template>
    </DataTable>
  </div>

  <div class="inventory-mobile-list" v-if="inventoryItems.length > 0">
    <div v-for="row in inventoryItems" :key="row.id || row.productCode" class="inventory-mobile-card card card-pad">
      <div class="inventory-mobile-card__header">
        <div class="product-cell">
          <div class="product-thumbnail">
            <i class="mdi mdi-package-variant-closed"></i>
          </div>
          <div class="product-info">
            <span class="product-name">{{ row.productName }}</span>
            <code class="sku-code text-xs">{{ row.productCode }}</code>
          </div>
        </div>
        <StatusBadge :status="getInventoryStatusLabel(row.status)" />
      </div>

      <div class="inventory-mobile-card__details">
        <div class="detail-row" v-if="row.warehouse">
          <span class="detail-label">Kho hàng</span>
          <span class="detail-val">
            {{ row.warehouse }}
            <code class="sku-code text-xs text-muted ml-1" v-if="row.warehouseCode">{{ row.warehouseCode }}</code>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Tồn hiện tại</span>
          <span class="detail-val">
            <span class="tabular-num font-semibold text-slate-800" :class="{ 'text-red-600 font-bold': row.status === 'OUT_OF_STOCK', 'text-amber-600 font-bold': row.status === 'LOW_STOCK' }">
              {{ row.currentQuantity ?? 0 }}
            </span>
          </span>
        </div>
        <div class="detail-row" v-if="row.minStock !== null">
          <span class="detail-label">Ngưỡng tối thiểu</span>
          <span class="detail-val">
            <span class="tabular-num">{{ row.minStock }}</span>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Cập nhật</span>
          <span class="detail-val text-xs text-muted">{{ formatDate(row.lastUpdatedAt) }}</span>
        </div>
      </div>
    </div>
  </div>

  <EmptyState
    v-else-if="!isLoading && !errorMessage"
    title="Không có tồn kho"
    description="Thử điều chỉnh bộ lọc hoặc kiểm tra lại dữ liệu backend."
  />

  <div v-if="inventoryItems.length > 0" class="pagination-bar card card-pad">
    <span class="muted">{{ totalElements }} bản ghi</span>
    <div class="pagination-actions">
      <button class="btn btn-sm" type="button" :disabled="!hasPreviousPage || isLoading" @click="previousPage">
        <i class="mdi mdi-chevron-left"></i>
        Trước
      </button>
      <span class="page-indicator">Trang {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span>
      <button class="btn btn-sm" type="button" :disabled="!hasNextPage || isLoading" @click="nextPage">
        Sau
        <i class="mdi mdi-chevron-right"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.filter-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-actions .btn {
  min-width: 108px;
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
  color: var(--text);
  white-space: nowrap;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .filter-actions,
  .filter-actions .btn {
    width: 100%;
  }

  .pagination-bar {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .pagination-actions {
    justify-content: center;
  }
}

/* Redesigned Inventory Styles */
.inventory-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.summary-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}
.summary-val {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.product-thumbnail {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  display: grid;
  place-items: center;
  color: var(--color-text-muted);
  font-size: 18px;
  flex-shrink: 0;
}
.product-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.product-name {
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.4;
}
.product-sub {
  font-size: 11px;
  color: var(--color-text-muted);
}
.sku-code {
  font-family: monospace;
  font-size: 12px;
  padding: 2px 6px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}
.tabular-num {
  font-variant-numeric: tabular-nums;
}
.warehouse-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}
.warehouse-name {
  font-weight: 500;
  color: var(--color-text-primary);
}
.quantity-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.threshold-hint {
  font-size: 11px;
  color: var(--color-text-muted);
}
.text-red-600 {
  color: var(--color-danger);
}
.text-amber-600 {
  color: var(--color-warning);
}
.ml-1 {
  margin-left: 4px;
}

/* Mobile responsive layout */
.inventory-mobile-list {
  display: none;
}

@media (max-width: 1023px) {
  .inventory-desktop-table {
    display: none;
  }
  .inventory-mobile-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .inventory-mobile-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }
  .inventory-mobile-card__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 12px;
  }
  .inventory-mobile-card__details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    font-size: 13px;
  }
  .detail-label {
    color: var(--color-text-secondary);
    font-weight: 500;
  }
  .detail-val {
    color: var(--color-text-primary);
    font-weight: 600;
    display: flex;
    align-items: center;
  }
}
</style>
