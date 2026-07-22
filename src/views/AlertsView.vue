<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import DataTable from "../components/DataTable.vue";
import EmptyState from "../components/EmptyState.vue";
import { getReplenishmentSuggestions } from "../services/replenishmentService";
import { getWarehouses } from "../services/warehouseService";

const router = useRouter();
const suggestions = ref([]);
const warehouses = ref([]);
const isLoading = ref(false);
const isLoadingDropdowns = ref(false);
const errorMessage = ref("");
const searchDraft = ref("");
const page = ref(0);
const size = ref(20);
const totalPages = ref(0);
const totalElements = ref(0);
const filters = reactive({ warehouseId: "" });
const latestRequestId = ref(0);

const columns = [
  { key: "productName", label: "Sản phẩm" },
  { key: "warehouseName", label: "Kho" },
  { key: "currentStock", label: "Tồn hiện tại" },
  { key: "minStock", label: "Tồn tối thiểu" },
  { key: "suggestedQuantity", label: "Số lượng đề xuất" },
];

const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);
const hasActiveFilters = computed(
  () => searchDraft.value.trim() !== "" || filters.warehouseId !== "",
);

onMounted(async () => {
  const dropdownLoaded = await loadDropdowns();
  if (dropdownLoaded) {
    await fetchSuggestions();
  }
});

async function loadDropdowns() {
  isLoadingDropdowns.value = true;
  errorMessage.value = "";
  try {
    const warehouseData = await getWarehouses({ status: "HOAT_DONG" });
    warehouses.value = Array.isArray(warehouseData)
      ? warehouseData
      : warehouseData?.content || [];
    return true;
  } catch (error) {
    const message = error?.message || "Không thể tải danh sách kho.";
    errorMessage.value = message;
    if (error?.status === 401) {
      router.replace("/login");
      return false;
    }
    return false;
  } finally {
    isLoadingDropdowns.value = false;
  }
}

async function fetchSuggestions() {
  const requestId = ++latestRequestId.value;
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const data = await getReplenishmentSuggestions({
      page: page.value,
      size: size.value,
      keyword: searchDraft.value.trim(),
      warehouseId: filters.warehouseId,
    });

    if (requestId !== latestRequestId.value) {
      return;
    }

    suggestions.value = data.content || [];
    totalPages.value = data.totalPages || 0;
    totalElements.value = data.totalElements || 0;
  } catch (error) {
    if (requestId !== latestRequestId.value) {
      return;
    }

    suggestions.value = [];
    errorMessage.value = error?.message || "Không thể tải dữ liệu.";
    if (error?.status === 401) {
      router.replace("/login");
    }
  } finally {
    if (requestId === latestRequestId.value) {
      isLoading.value = false;
    }
  }
}

function applySearch() {
  page.value = 0;
  fetchSuggestions();
}

function applyFilter() {
  page.value = 0;
  fetchSuggestions();
}

function clearFilters() {
  searchDraft.value = "";
  filters.warehouseId = "";
  page.value = 0;
  fetchSuggestions();
}

function previousPage() {
  if (!hasPreviousPage.value) return;
  page.value -= 1;
  fetchSuggestions();
}

function nextPage() {
  if (!hasNextPage.value) return;
  page.value += 1;
  fetchSuggestions();
}

function displayWarehouseOption(warehouse) {
  const code = warehouse.maKho || warehouse.code || warehouse.warehouseCode;
  const name = warehouse.tenKho || warehouse.name || warehouse.warehouseName;
  return code ? `${code} - ${name || "-"}` : name || "-";
}
</script>

<template>
  <PageHeader
    title="Cảnh báo tồn kho"
    description="Danh sách gợi ý nhập hàng dựa trên dữ liệu tồn kho hiện tại."
  />

  <SearchFilterBar
    v-model="searchDraft"
    placeholder="Tìm theo mã/sản phẩm, tên sản phẩm"
    @keyup.enter="applySearch"
  >
    <select
      v-model="filters.warehouseId"
      class="select"
      :disabled="isLoadingDropdowns || isLoading"
      @change="applyFilter"
    >
      <option value="">
        {{ isLoadingDropdowns ? "Đang tải kho..." : "Tất cả kho" }}
      </option>
      <option
        v-for="warehouse in warehouses"
        :key="warehouse.id"
        :value="warehouse.id"
      >
        {{ displayWarehouseOption(warehouse) }}
      </option>
    </select>

    <div class="filter-actions">
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
        class="btn btn-ghost"
        type="button"
        :disabled="isLoading"
        @click="clearFilters"
      >
        <i class="mdi mdi-filter-remove-outline"></i>
        Xóa lọc
      </button>
    </div>
  </SearchFilterBar>

  <p v-if="errorMessage" class="form-alert form-alert-error">
    {{ errorMessage }}
  </p>

  <div v-if="isLoading" class="loading-state card card-pad">
    <i class="mdi mdi-loading mdi-spin"></i>
    <span>Đang tải gợi ý nhập hàng...</span>
  </div>

  <DataTable
    v-else-if="suggestions.length > 0"
    :columns="columns"
    :rows="suggestions"
    empty-text="Không có gợi ý nhập hàng phù hợp"
  >
    <template #productName="{ row }">{{
      row.productName || row.productCode || "-"
    }}</template>
    <template #warehouseName="{ row }">{{
      row.warehouseName || row.warehouseCode || "-"
    }}</template>
  </DataTable>

  <EmptyState
    v-else-if="!isLoading && !errorMessage"
    title="Không có gợi ý nhập hàng"
    description="Chưa có dữ liệu phù hợp với bộ lọc hiện tại."
  />

  <div v-if="suggestions.length > 0" class="pagination-bar card card-pad">
    <span class="muted">{{ totalElements }} bản ghi</span>
    <div class="pagination-actions">
      <button
        class="btn btn-sm"
        type="button"
        :disabled="!hasPreviousPage || isLoading"
        @click="previousPage"
      >
        <i class="mdi mdi-chevron-left"></i>
        Trước
      </button>
      <span class="page-indicator"
        >Trang {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span
      >
      <button
        class="btn btn-sm"
        type="button"
        :disabled="!hasNextPage || isLoading"
        @click="nextPage"
      >
        Sau
        <i class="mdi mdi-chevron-right"></i>
      </button>
    </div>
  </div>

  <div class="note-box card card-pad">
    <i class="mdi mdi-information-outline"></i>
    <span>Đây chỉ là gợi ý tham khảo.</span>
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

.loading-state {
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
  gap: 16px;
  margin-top: 16px;
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

.note-box {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-weight: 600;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
