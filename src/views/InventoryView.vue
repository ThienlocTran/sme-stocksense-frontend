<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { getInventory } from "../services/inventoryService";

const router = useRouter();
const inventoryItems = ref([]);
const isLoading = ref(false);
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

const columns = [
  { key: "productCode", label: "Mã SP" },
  { key: "productName", label: "Tên sản phẩm" },
  { key: "barcode", label: "Mã vạch" },
  { key: "warehouse", label: "Kho" },
  { key: "currentQuantity", label: "Tồn hiện tại" },
  { key: "minStock", label: "Ngưỡng tối thiểu" },
  { key: "maxStock", label: "Ngưỡng tối đa" },
  { key: "status", label: "Trạng thái tồn" },
  { key: "warehouseStatus", label: "Trạng thái kho" },
  { key: "productStatus", label: "Trạng thái SP" },
  { key: "lastUpdatedAt", label: "Cập nhật lần cuối" },
];

const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);

onMounted(fetchInventory);

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

function clearFilters() {
  searchDraft.value = "";
  filters.warehouseId = "";
  filters.stockStatus = "";
  filters.warehouseStatus = "";
  filters.productStatus = "";
  page.value = 0;
  fetchInventory();
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
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN", { hour12: false });
}
</script>

<template>
  <PageHeader
    title="Tồn kho"
    description="Danh sách tồn kho theo sản phẩm và kho."
  />

  <SearchFilterBar
    v-model="searchDraft"
    placeholder="Tìm theo mã sản phẩm, tên sản phẩm, mã vạch"
  >
    <input
      v-model="filters.warehouseId"
      class="input"
      type="number"
      min="1"
      placeholder="ID kho"
    />
    <select v-model="filters.stockStatus" class="select">
      <option value="">Tất cả trạng thái tồn</option>
      <option value="OUT_OF_STOCK">Hết hàng</option>
      <option value="LOW_STOCK">Sắp hết</option>
      <option value="NORMAL">Bình thường</option>
      <option value="OVER_STOCK">Thừa hàng</option>
    </select>
    <select v-model="filters.warehouseStatus" class="select">
      <option value="">Tất cả trạng thái kho</option>
      <option value="HOAT_DONG">Đang hoạt động</option>
      <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
    </select>
    <select v-model="filters.productStatus" class="select">
      <option value="">Tất cả trạng thái SP</option>
      <option value="HOAT_DONG">Đang hoạt động</option>
      <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
    </select>
    <button class="btn" type="button" @click="applySearch">
      <i class="mdi mdi-magnify"></i> Tìm
    </button>
    <button class="btn btn-ghost" type="button" @click="clearFilters">
      Xóa lọc
    </button>
  </SearchFilterBar>

  <p v-if="errorMessage" class="form-alert form-alert-error">
    {{ errorMessage }}
  </p>

  <div v-if="isLoading" class="inventory-loading card card-pad">
    Đang tải dữ liệu tồn kho...
  </div>

  <DataTable
    v-else-if="inventoryItems.length > 0"
    :columns="columns"
    :rows="inventoryItems"
    empty-text="Không có dữ liệu tồn kho phù hợp"
  >
    <template #status="{ value }"><StatusBadge :status="value" /></template>
    <template #warehouseStatus="{ value }"
      ><StatusBadge :status="value"
    /></template>
    <template #productStatus="{ value }"
      ><StatusBadge :status="value"
    /></template>
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
