<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import SearchableSelect from "../components/SearchableSelect.vue";
import { getInventory, saveWarehouseStockConfig } from "../services/inventoryService";
import { getWarehouses } from "../services/warehouseService";
import { getWarehouseStatusLabel } from "../constants/warehouseOptions";
import { canManageProducts } from "../services/permissionService";

const router = useRouter();
const { t } = useI18n();
const route = useRoute();
const inventoryItems = ref([]);
const warehouses = ref([]);
const isLoading = ref(false);
const isLoadingDropdowns = ref(false);
const errorMessage = ref("");
const searchDraft = ref(route.query.keyword ? String(route.query.keyword) : "");

watch(
  () => route.query,
  (newQuery) => {
    searchDraft.value = newQuery.keyword ? String(newQuery.keyword) : "";
    filters.warehouseId = newQuery.warehouseId ? String(newQuery.warehouseId) : "";
    page.value = 0;
    fetchInventory();
  },
  { deep: true }
);
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

const inventoryStatusOptions = computed(() => [
  { value: "OUT_OF_STOCK", label: t('inventory.status.outOfStock') },
  { value: "LOW_STOCK", label: t('inventory.status.lowStock') },
  { value: "NORMAL", label: t('inventory.status.inStock') },
  { value: "OVER_STOCK", label: t('inventory.status.overStock') },
]);

const canManage = computed(() => canManageProducts());

const warehouseOptions = computed(() => {
  return [
    { value: "", label: isLoadingDropdowns.value ? t('inventory.filters.loadingWarehouses') : t('inventory.filters.allWarehouses') },
    ...warehouses.value.map(w => {
      const code = w.maKho || w.code;
      const name = w.tenKho || w.name;
      const label = code ? `${code} - ${name || "-"}` : name || "-";
      return {
        value: w.id,
        label,
        sublabel: w.diaChi || '',
        searchKey: `${code || ''} ${name || ''}`.toLowerCase()
      };
    })
  ];
});

const columns = computed(() => [
  { key: "productCode", label: t('inventory.columns.productCode'), class: "cell-compact" },
  { key: "productName", label: t('inventory.columns.productName'), class: "cell-long" },
  { key: "unitVolumeM3", label: "Thể tích (m³)", class: "cell-compact text-right" },
  { key: "warehouse", label: t('inventory.columns.warehouse'), class: "cell-medium" },
  { key: "currentQuantity", label: t('inventory.columns.quantityThreshold'), class: "cell-medium text-right" },
  { key: "status", label: t('inventory.columns.status'), class: "cell-nowrap" },
  { key: "warehouseStatus", label: t('inventory.columns.warehouseStatus'), class: "cell-nowrap" },
  { key: "productStatus", label: t('inventory.columns.productStatus'), class: "cell-nowrap" },
  { key: "lastUpdatedAt", label: t('inventory.columns.lastUpdated'), class: "cell-nowrap" },
]);

const isConfigOpen = ref(false);
const configForm = reactive({
  productId: null,
  warehouseId: null,
  productCode: "",
  productName: "",
  warehouseName: "",
  minStock: 0,
});
const isSavingConfig = ref(false);
const configErrorMessage = ref("");

function openMinStockConfig(row) {
  if (!canManage.value) return;
  configForm.productId = row.productId;
  configForm.warehouseId = row.warehouseId;
  configForm.productCode = row.productCode;
  configForm.productName = row.productName;
  configForm.warehouseName = row.warehouse;
  configForm.minStock = (row.minStock !== null && row.minStock !== undefined) ? String(row.minStock) : "";
  configErrorMessage.value = "";
  isConfigOpen.value = true;
}

function closeConfigModal() {
  if (isSavingConfig.value) return;
  isConfigOpen.value = false;
}

async function submitConfigForm() {
  if (!canManage.value) return;
  const rawVal = String(configForm.minStock).trim();
  if (rawVal === "") {
    configErrorMessage.value = t('products.errMinStockRequired');
    return;
  }
  const val = Number(rawVal);
  if (isNaN(val) || !Number.isFinite(val) || !Number.isInteger(val) || val < 0 || rawVal !== String(val)) {
    configErrorMessage.value = t('products.errMinStockInvalid');
    return;
  }
  isSavingConfig.value = true;
  configErrorMessage.value = "";
  try {
    await saveWarehouseStockConfig({
      productId: configForm.productId,
      warehouseId: configForm.warehouseId,
      minStock: val,
    });
    
    // Update local row state first
    const row = inventoryItems.value.find(
      (item) => item.productId === configForm.productId && item.warehouseId === configForm.warehouseId
    );
    if (row) {
      row.minStock = val;
    }

    isConfigOpen.value = false;
    await fetchInventory();
  } catch (error) {
    configErrorMessage.value = error.message;
  } finally {
    isSavingConfig.value = false;
  }
}

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

const searchDebounceTimer = ref(null);
watch(searchDraft, (newVal) => {
  if (searchDebounceTimer.value) clearTimeout(searchDebounceTimer.value);
  searchDebounceTimer.value = setTimeout(() => {
    page.value = 0;
    fetchInventory();
  }, 300);
});

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
  return inventoryStatusOptions.value.find((option) => option.value === status)?.label || status || "-";
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
  <PageHeader :title="t('inventory.pageTitle')" :description="t('inventory.pageDescription')" />

  <!-- Inventory Summary Metrics -->
  <div v-if="!isLoading && inventoryItems.length > 0" class="inventory-summary">
    <div class="summary-card card card-pad">
      <span class="summary-label">{{ t('inventory.summary.totalRecords') }}</span>
      <strong class="summary-val text-blue-600">{{ totalElements }}</strong>
    </div>
    <div class="summary-card card card-pad">
      <span class="summary-label">{{ t('inventory.summary.recordsPerPage') }}</span>
      <strong class="summary-val">{{ inventoryItems.length }}</strong>
    </div>
    <div class="summary-card card card-pad">
      <span class="summary-label">{{ t('inventory.summary.monitoredWarehouses') }}</span>
      <strong class="summary-val text-emerald-600">{{ warehouses.length }}</strong>
    </div>
  </div>

  <SearchFilterBar
    v-model="searchDraft"
    :placeholder="t('inventory.filters.searchPlaceholder')"
    @keyup.enter="applySearch"
  >
    <SearchableSelect
      v-model="filters.warehouseId"
      :options="warehouseOptions"
      :placeholder="t('inventory.filters.allWarehouses')"
      :disabled="isLoadingDropdowns || isLoading"
      @change="applyFilter"
    />

    <select v-model="filters.stockStatus" class="select" :disabled="isLoading" @change="applyFilter">
      <option value="">{{ t('inventory.filters.allStockStatuses') }}</option>
      <option v-for="option in inventoryStatusOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <select v-model="filters.warehouseStatus" class="select" :disabled="isLoading" @change="applyFilter">
      <option value="">{{ t('inventory.filters.allWarehouseStatuses') }}</option>
      <option value="HOAT_DONG">{{ t('inventory.status.active') }}</option>
      <option value="NGUNG_HOAT_DONG">{{ t('inventory.status.inactive') }}</option>
    </select>

    <select v-model="filters.productStatus" class="select" :disabled="isLoading" @change="applyFilter">
      <option value="">{{ t('inventory.filters.allProductStatuses') }}</option>
      <option value="HOAT_DONG">{{ t('inventory.status.active') }}</option>
      <option value="NGUNG_HOAT_DONG">{{ t('inventory.status.inactive') }}</option>
    </select>

    <div class="filter-actions">
      <button class="btn btn-primary" type="button" :disabled="isLoading" @click="applySearch">
        <i class="mdi mdi-magnify"></i>
        {{ t('inventory.filters.searchBtn') }}
      </button>
      <button v-if="hasActiveFilters" class="btn btn-ghost" type="button" :disabled="isLoading" @click="clearFilters">
        <i class="mdi mdi-filter-remove-outline"></i>
        {{ t('inventory.filters.clearFiltersBtn') }}
      </button>
    </div>
  </SearchFilterBar>

  <p v-if="errorMessage" class="form-alert form-alert-error">{{ errorMessage }}</p>

  <div v-if="isLoading" class="inventory-loading card card-pad">
    <i class="mdi mdi-loading mdi-spin"></i>
    <span>{{ t('inventory.loading') }}</span>
  </div>

  <div class="inventory-desktop-table">
    <DataTable
      v-if="inventoryItems.length > 0"
      :columns="columns"
      :rows="inventoryItems"
      min-width="1200px"
      :empty-text="t('inventory.emptyText')"
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
      <template #unitVolumeM3="{ value }">
        <span v-if="value !== null && value !== undefined" class="tabular-num text-xs">{{ value.toFixed(3) }} m³</span>
        <span v-else class="text-slate-400 italic text-xs">Chưa cấu hình</span>
      </template>
      <template #warehouse="{ row }">
        <div class="warehouse-cell">
          <span class="warehouse-name">{{ row.warehouse }}</span>
          <code class="sku-code text-muted text-xs" v-if="row.warehouseCode">{{ row.warehouseCode }}</code>
        </div>
      </template>
      <template #currentQuantity="{ value, row }">
        <div class="quantity-cell flex items-center justify-between">
          <div class="flex-grow">
            <span class="tabular-num font-semibold text-slate-800" :class="{ 'text-red-600 font-bold': row.status === 'OUT_OF_STOCK', 'text-amber-600 font-bold': row.status === 'LOW_STOCK' }">
              {{ value ?? 0 }}
            </span>
            <span class="threshold-hint" v-if="row.minStock !== null">/ Min: {{ row.minStock }}</span>
            <span class="threshold-hint text-slate-400 italic" v-else>/ Min: Chưa cấu hình</span>
          </div>
          <button
            v-if="canManage"
            class="btn btn-icon btn-xs ml-2 text-blue-600 hover:text-blue-800 transition"
            type="button"
            @click="openMinStockConfig(row)"
            title="Cấu hình tồn tối thiểu"
          >
            <i class="mdi mdi-cog-outline text-base"></i>
          </button>
        </div>
      </template>
      <template #status="{ value }">
        <StatusBadge :status="getInventoryStatusLabel(value)" />
      </template>
      <template #warehouseStatus="{ value }">
        <StatusBadge :status="getWarehouseStatusLabel(value)" />
      </template>
      <template #productStatus="{ value }">
        <StatusBadge :status="value === 'HOAT_DONG' ? t('inventory.status.active') : t('inventory.status.inactive')" />
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
          <span class="detail-label">{{ t('inventory.columns.warehouse') }}</span>
          <span class="detail-val">
            {{ row.warehouse }}
            <code class="sku-code text-xs text-muted ml-1" v-if="row.warehouseCode">{{ row.warehouseCode }}</code>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('inventory.columns.currentStock') }}</span>
          <span class="detail-val">
            <span class="tabular-num font-semibold text-slate-800" :class="{ 'text-red-600 font-bold': row.status === 'OUT_OF_STOCK', 'text-amber-600 font-bold': row.status === 'LOW_STOCK' }">
              {{ row.currentQuantity ?? 0 }}
            </span>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Thể tích đơn vị</span>
          <span class="detail-val">
            <span v-if="row.unitVolumeM3 !== null && row.unitVolumeM3 !== undefined" class="tabular-num text-xs">{{ row.unitVolumeM3.toFixed(3) }} m³</span>
            <span v-else class="text-slate-400 italic text-xs">Chưa cấu hình</span>
          </span>
        </div>
        <div class="detail-row flex items-center justify-between">
          <span class="detail-label">{{ t('inventory.columns.minStockThreshold') }}</span>
          <span class="detail-val flex items-center">
            <span class="tabular-num">{{ row.minStock !== null ? row.minStock : "Chưa cấu hình" }}</span>
            <button
              v-if="canManage"
              class="btn btn-icon btn-xs ml-2 text-blue-600 hover:text-blue-800 transition"
              type="button"
              @click="openMinStockConfig(row)"
              title="Cấu hình tồn tối thiểu"
            >
              <i class="mdi mdi-cog-outline text-sm"></i>
            </button>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('inventory.columns.lastUpdated') }}</span>
          <span class="detail-val text-xs text-muted">{{ formatDate(row.lastUpdatedAt) }}</span>
        </div>
      </div>
    </div>
  </div>

  <EmptyState
    v-else-if="!isLoading && !errorMessage"
    :title="t('inventory.emptyTitle')"
    :description="t('inventory.emptyDescription')"
  />

  <div v-if="inventoryItems.length > 0" class="pagination-bar card card-pad">
    <span class="muted">{{ t('inventory.pagination.recordsCount', { count: totalElements }) }}</span>
    <div class="pagination-actions">
      <button class="btn btn-sm" type="button" :disabled="!hasPreviousPage || isLoading" @click="previousPage">
        <i class="mdi mdi-chevron-left"></i>
        {{ t('inventory.pagination.previous') }}
      </button>
      <span class="page-indicator">{{ t('inventory.pagination.pageIndicator', { current: totalPages === 0 ? 0 : page + 1, total: totalPages }) }}</span>
      <button class="btn btn-sm" type="button" :disabled="!hasNextPage || isLoading" @click="nextPage">
        {{ t('inventory.pagination.next') }}
        <i class="mdi mdi-chevron-right"></i>
      </button>
    </div>
  </div>

  <!-- Modal Cấu hình định mức tồn tối thiểu -->
  <div v-if="isConfigOpen" class="modal-backdrop">
    <div class="modal w-full max-w-md">
      <form @submit.prevent="submitConfigForm" class="flex flex-col gap-4">
        <div class="modal-head flex items-center justify-between border-b pb-3 mb-2">
          <h2 class="section-title">Cấu hình tồn tối thiểu</h2>
          <button class="btn btn-icon text-slate-400 hover:text-slate-600" type="button" @click="closeConfigModal" :disabled="isSavingConfig">
            <i class="mdi mdi-close text-xl"></i>
          </button>
        </div>

        <div class="modal-body flex flex-col gap-4">
          <div v-if="configErrorMessage" class="form-alert form-alert-error py-2 px-3 bg-red-50 text-red-600 rounded text-sm font-semibold">
            {{ configErrorMessage }}
          </div>

          <div class="field">
            <label class="field-label font-semibold text-slate-700 block mb-1">Sản phẩm</label>
            <input
              type="text"
              class="input bg-slate-100 cursor-not-allowed"
              :value="configForm.productCode + ' - ' + configForm.productName"
              disabled
            />
          </div>

          <div class="field">
            <label class="field-label font-semibold text-slate-700 block mb-1">Kho hàng</label>
            <input
              type="text"
              class="input bg-slate-100 cursor-not-allowed"
              :value="configForm.warehouseName"
              disabled
            />
          </div>

          <div class="field">
            <label class="field-label font-semibold text-slate-700 block mb-1">Định mức tồn tối thiểu</label>
            <input
              v-model="configForm.minStock"
              class="input"
              type="text"
              required
              :disabled="isSavingConfig"
              placeholder="Nhập định mức tồn tối thiểu (Min)..."
            />
            <small class="field-note text-slate-400 block mt-1">Khi tồn kho thực tế giảm xuống dưới định mức này, hệ thống sẽ tự động đề xuất bổ sung hàng.</small>
          </div>
        </div>

        <div class="modal-foot flex justify-end gap-3 mt-4 pt-3 border-t">
          <button
            class="btn btn-secondary"
            type="button"
            :disabled="isSavingConfig"
            @click="closeConfigModal"
          >
            Hủy
          </button>
          <button class="btn btn-primary" type="submit" :disabled="isSavingConfig">
            <i v-if="isSavingConfig" class="mdi mdi-loading mdi-spin mr-1"></i>
            Lưu cấu hình
          </button>
        </div>
      </form>
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

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
}
.btn-icon:hover {
  background: #f1f5f9;
}
.btn-xs {
  padding: 2px;
}
</style>
