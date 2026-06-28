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
  { key: "productCode", label: "Mã SP" },
  { key: "productName", label: "Tên sản phẩm" },
  { key: "warehouseName", label: "Kho" },
  { key: "transactionType", label: "Loại giao dịch" },
  { key: "delta", label: "Biến động" },
  { key: "createdByName", label: "Người thực hiện" },
  { key: "createdAt", label: "Ngày tạo" },
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
    const params = {
      page: page.value,
      size: size.value,
      keyword: searchDraft.value.trim() || undefined,
      transactionType: filters.transactionType || undefined,
      warehouseId: filters.warehouseId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    };

    const data = await getInventoryTransactions(params);
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
  return (
    transactionTypeOptions.find((option) => option.value === type)?.label ||
    "Không xác định"
  );
}

function getDelta(row) {
  const before = Number(row.quantityBefore ?? 0);
  const after = Number(row.quantityAfter ?? 0);
  const delta = after - before;
  return delta >= 0 ? `+${delta}` : `${delta}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function displayWarehouseName(row) {
  return row.warehouseName || row.warehouseCode || "-";
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
    <select
      v-model="filters.transactionType"
      class="select filter-field filter-field-short"
      :disabled="isLoading"
      @change="applyFilter"
    >
      <option
        v-for="option in transactionTypeOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <select
      v-model="filters.warehouseId"
      class="select filter-field filter-field-short"
      :disabled="isLoadingDropdowns || isLoading"
      @change="applyFilter"
    >
      <option value="">Tất cả kho</option>
      <option
        v-for="warehouse in warehouses"
        :key="warehouse.id"
        :value="warehouse.id"
      >
        {{
          warehouse.code
            ? `${warehouse.code} - ${warehouse.name}`
            : warehouse.name
        }}
      </option>
    </select>

    <input
      v-model="filters.from"
      type="datetime-local"
      class="input datetime-input filter-field filter-field-date"
      :disabled="isLoading"
      @change="applyFilter"
      aria-label="Từ ngày"
    />

    <div class="filter-action-group">
      <button
        class="btn btn-primary"
        type="button"
        :disabled="isLoading"
        @click="applySearch"
      >
        <i class="mdi mdi-magnify"></i>
        Tìm kiếm
      </button>
      <button
        v-if="hasActiveFilters"
        class="btn"
        type="button"
        :disabled="isLoading"
        @click="clearFilters"
      >
        Xóa bộ lọc
      </button>
    </div>
  </SearchFilterBar>

  <p v-if="errorMessage" class="form-alert form-alert-error">
    {{ errorMessage }}
  </p>

  <div v-if="isLoading" class="inventory-loading card card-pad">
    Đang tải lịch sử giao dịch kho...
  </div>

  <DataTable
    v-else-if="transactions.length > 0"
    :columns="columns"
    :rows="transactions"
  >
    <template #transactionType="{ row }">
      <StatusBadge :status="getTransactionTypeLabel(row.transactionType)" />
    </template>
    <template #delta="{ row }">{{ getDelta(row) }}</template>
    <template #warehouseName="{ row }">{{
      displayWarehouseName(row)
    }}</template>
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
      <button
        class="btn btn-sm"
        type="button"
        :disabled="!hasPreviousPage"
        @click="previousPage"
      >
        Trước
      </button>
      <span class="page-indicator"
        >Trang {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span
      >
      <button
        class="btn btn-sm"
        type="button"
        :disabled="!hasNextPage"
        @click="nextPage"
      >
        Sau
      </button>
    </div>
  </div>
</template>

<style scoped>
.inventory-loading {
  min-height: 120px;
  display: grid;
  place-items: center;
  color: var(--muted);
}

.filter-bar :deep(.search-input) {
  max-width: none;
  flex: 1 1 360px;
  min-width: 260px;
}

.datetime-input {
  max-width: 220px;
}

.filter-field {
  min-width: 180px;
}

.filter-field-short {
  max-width: 220px;
  min-width: 180px;
}

.filter-field-date {
  max-width: 220px;
  min-width: 180px;
}

.filter-action-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-action-group .btn {
  min-width: 98px;
}

@media (max-width: 1100px) {
  .filter-bar :deep(.search-input) {
    flex: 1 1 280px;
  }
}

@media (max-width: 900px) {
  .filter-bar :deep(.search-input) {
    min-width: 0;
    flex: 1 1 100%;
  }

  .filter-bar :deep(.select.filter-field-short),
  .filter-bar :deep(.input.filter-field-date) {
    flex: 1 1 45%;
    max-width: none;
  }

  .filter-action-group {
    width: 100%;
    justify-content: flex-start;
  }
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

@media (max-width: 900px) {
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
