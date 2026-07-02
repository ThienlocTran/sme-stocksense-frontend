<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import DataTable from "../components/DataTable.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { getInventoryTransactions } from "../services/inventoryService";
import { getWarehouses } from "../services/warehouseService";

const router = useRouter();
const transactions = ref([]);
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
  transactionType: "",
  warehouseId: "",
  from: "",
  to: "",
});

const transactionTypeOptions = [
  { value: "", label: "Tất cả loại giao dịch" },
  { value: "NHAP_KHO", label: "Nhập kho" },
  { value: "XUAT_KHO", label: "Xuất kho" },
  { value: "NHAP_DAU_KY", label: "Nhập đầu kỳ" },
  { value: "DIEU_CHINH_TANG", label: "Điều chỉnh tăng" },
  { value: "DIEU_CHINH_GIAM", label: "Điều chỉnh giảm" },
];

const columns = [
  { key: "productCode", label: "Mã SP", class: "cell-compact" },
  { key: "productName", label: "Tên sản phẩm", class: "cell-long" },
  { key: "warehouseName", label: "Kho", class: "cell-medium" },
  { key: "transactionType", label: "Loại giao dịch", class: "cell-nowrap" },
  { key: "delta", label: "Biến động", class: "cell-compact" },
  { key: "createdByName", label: "Người thực hiện", class: "cell-medium" },
  { key: "createdAt", label: "Ngày tạo", class: "cell-nowrap" },
];

const hasActiveFilters = computed(() => {
  return (
    searchDraft.value.trim() !== "" ||
    filters.transactionType !== "" ||
    filters.warehouseId !== "" ||
    filters.from !== "" ||
    filters.to !== ""
  );
});

const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);

onMounted(async () => {
  await loadDropdowns();
  fetchTransactions();
});

async function loadDropdowns() {
  isLoadingDropdowns.value = true;
  errorMessage.value = "";

  try {
    warehouses.value = await getWarehouses({ status: "HOAT_DONG" });
  } catch (error) {
    warehouses.value = [];
    errorMessage.value = error.message;
    if (error.status === 401) router.replace("/login");
  } finally {
    isLoadingDropdowns.value = false;
  }
}

async function fetchTransactions() {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const data = await getInventoryTransactions({
      page: page.value,
      size: size.value,
      keyword: searchDraft.value.trim() || undefined,
      transactionType: filters.transactionType || undefined,
      warehouseId: filters.warehouseId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    });

    transactions.value = data.content || [];
    totalPages.value = data.totalPages || 0;
    totalElements.value = data.totalElements || 0;
  } catch (error) {
    transactions.value = [];
    errorMessage.value = error.message;
    if (error.status === 401) router.replace("/login");
  } finally {
    isLoading.value = false;
  }
}

function applySearch() {
  page.value = 0;
  fetchTransactions();
}

function applyFilter() {
  page.value = 0;
  fetchTransactions();
}

function clearFilters() {
  searchDraft.value = "";
  filters.transactionType = "";
  filters.warehouseId = "";
  filters.from = "";
  filters.to = "";
  page.value = 0;
  fetchTransactions();
}

function getTransactionTypeLabel(type) {
  return transactionTypeOptions.find((option) => option.value === type)?.label || "Không xác định";
}

function getDelta(row) {
  const before = Number(row.quantityBefore ?? 0);
  const after = Number(row.quantityAfter ?? 0);
  const delta = after - before;
  return delta >= 0 ? `+${delta}` : `${delta}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", { hour12: false });
}

function displayWarehouseName(row) {
  return row.warehouseCode ? `${row.warehouseCode} - ${row.warehouseName}` : row.warehouseName || "-";
}

function displayWarehouseOption(warehouse) {
  const code = warehouse.maKho || warehouse.code;
  const name = warehouse.tenKho || warehouse.name;
  return code ? `${code} - ${name || "-"}` : name || "-";
}

function previousPage() {
  if (!hasPreviousPage.value) return;
  page.value -= 1;
  fetchTransactions();
}

function nextPage() {
  if (!hasNextPage.value) return;
  page.value += 1;
  fetchTransactions();
}
</script>

<template>
  <PageHeader
    title="Lịch sử giao dịch kho"
    description="Xem lịch sử biến động kho theo sản phẩm, kho và thời gian."
  />

  <SearchFilterBar
    v-model="searchDraft"
    placeholder="Tìm theo mã SP, tên sản phẩm hoặc người thực hiện"
    @keyup.enter="applySearch"
  >
    <select v-model="filters.transactionType" class="select" :disabled="isLoading" @change="applyFilter">
      <option v-for="option in transactionTypeOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <select v-model="filters.warehouseId" class="select" :disabled="isLoadingDropdowns || isLoading" @change="applyFilter">
      <option value="">{{ isLoadingDropdowns ? "Đang tải kho..." : "Tất cả kho" }}</option>
      <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
        {{ displayWarehouseOption(warehouse) }}
      </option>
    </select>

    <input
      v-model="filters.from"
      type="datetime-local"
      class="input"
      :disabled="isLoading"
      @change="applyFilter"
      aria-label="Từ ngày"
    />

    <input
      v-model="filters.to"
      type="datetime-local"
      class="input"
      :disabled="isLoading"
      @change="applyFilter"
      aria-label="Đến ngày"
    />

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
    <span>Đang tải lịch sử giao dịch kho...</span>
  </div>

  <DataTable v-else-if="transactions.length > 0" :columns="columns" :rows="transactions" min-width="1080px">
    <template #transactionType="{ row }">
      <StatusBadge :status="getTransactionTypeLabel(row.transactionType)" />
    </template>
    <template #delta="{ row }">
      <span :class="Number(getDelta(row)) >= 0 ? 'delta-up' : 'delta-down'">{{ getDelta(row) }}</span>
    </template>
    <template #warehouseName="{ row }">{{ displayWarehouseName(row) }}</template>
    <template #createdAt="{ value }">{{ formatDate(value) }}</template>
  </DataTable>

  <EmptyState
    v-else-if="!isLoading && !errorMessage"
    title="Không có giao dịch kho"
    description="Thử thay đổi bộ lọc hoặc kiểm tra dữ liệu."
  />

  <div v-if="transactions.length > 0" class="pagination-bar card card-pad">
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

.delta-up {
  color: #15803d;
  font-weight: 800;
}

.delta-down {
  color: #b91c1c;
  font-weight: 800;
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

:deep(.badge.status-nhập-kho) {
  background: #dcfce7;
  color: #15803d;
}

:deep(.badge.status-xuất-kho) {
  background: #fee2e2;
  color: #b91c1c;
}

:deep(.badge.status-nhập-đầu-kỳ),
:deep(.badge.status-điều-chỉnh-tăng),
:deep(.badge.status-điều-chỉnh-giảm) {
  background: #fef3c7;
  color: #b45309;
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
