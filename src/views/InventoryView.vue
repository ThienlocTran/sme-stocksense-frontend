<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { getInventory } from "../services/inventoryService";
import { getWarehouses } from "../services/warehouseService";
import { getWarehouseStatusLabel } from "../constants/warehouseOptions";

const router = useRouter();
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
  warehouseId: "",
  stockStatus: "",
  warehouseStatus: "",
  productStatus: "",
});

const inventoryStatusOptions = [
  { value: "OUT_OF_STOCK", label: "Thiếu hàng" },
  { value: "LOW_STOCK", label: "Sắp hết" },
  { value: "NORMAL", label: "Đủ hàng" },
  { value: "OVER_STOCK", label: "Thừa hàng" },
];

const columns = [
  { key: "productCode", label: "Mã SP", class: "cell-compact" },
  { key: "productName", label: "Tên sản phẩm" },
  { key: "barcode", label: "Mã vạch", class: "cell-nowrap" },
  { key: "warehouse", label: "Kho" },
  { key: "currentQuantity", label: "Tồn hiện tại", class: "cell-compact" },
  { key: "minStock", label: "Ngưỡng tối thiểu", class: "cell-compact" },
  { key: "maxStock", label: "Ngưỡng tối đa", class: "cell-compact" },
  { key: "status", label: "Trạng thái tồn", class: "cell-nowrap" },
  { key: "warehouseStatus", label: "Trạng thái kho", class: "cell-nowrap" },
  { key: "productStatus", label: "Trạng thái SP", class: "cell-nowrap" },
  { key: "lastUpdatedAt", label: "Cập nhật lần cuối", class: "cell-nowrap" },
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
  return warehouse.maKho ? `${warehouse.maKho} - ${warehouse.tenKho}` : warehouse.tenKho;
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

  <DataTable
    v-else-if="inventoryItems.length > 0"
    :columns="columns"
    :rows="inventoryItems"
    min-width="1360px"
    empty-text="Không có dữ liệu tồn kho phù hợp"
  >
    <template #warehouse="{ row }">{{ displayWarehouseName(row) }}</template>
    <template #status="{ value }"><StatusBadge :status="getInventoryStatusLabel(value)" /></template>
    <template #warehouseStatus="{ value }"><StatusBadge :status="getWarehouseStatusLabel(value)" /></template>
    <template #productStatus="{ value }"><StatusBadge :status="value === 'HOAT_DONG' ? 'Đang hoạt động' : 'Ngừng hoạt động'" /></template>
    <template #lastUpdatedAt="{ value }">{{ formatDate(value) }}</template>
  </DataTable>

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
</style>
