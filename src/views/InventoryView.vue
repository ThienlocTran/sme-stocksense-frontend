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
import { getProduct } from "../services/productService";
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
const requestToken = ref(0);

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
  { key: "currentQuantity", label: "Số lượng thực tế", class: "cell-compact text-right font-bold" },
  { key: "minStock", label: "Tồn tối thiểu hiệu lực", class: "cell-compact text-right" },
  { key: "thresholdSource", label: "Nguồn định mức", class: "cell-nowrap" },
  { key: "status", label: "Trạng thái cảnh báo", class: "cell-nowrap" },
  { key: "lastUpdatedAt", label: t('inventory.columns.lastUpdated'), class: "cell-nowrap" },
]);

const isConfigOpen = ref(false);
const configForm = reactive({
  productId: null,
  warehouseId: null,
  productCode: "",
  productName: "",
  warehouseName: "",
  defaultMinStock: 0,
  useDefault: true,
  overrideValue: "",
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
  configForm.defaultMinStock = row.defaultMinStock ?? 0;
  configForm.useDefault = !row.isOverride;
  configForm.overrideValue = row.isOverride ? String(row.minStock) : "";
  configErrorMessage.value = "";
  isConfigOpen.value = true;
}

function closeConfigModal() {
  if (isSavingConfig.value) return;
  isConfigOpen.value = false;
}

async function submitConfigForm() {
  if (!canManage.value) return;
  
  let val = null;
  if (!configForm.useDefault) {
    const rawVal = String(configForm.overrideValue).trim();
    if (rawVal === "") {
      configErrorMessage.value = t('products.errMinStockRequired');
      return;
    }
    val = Number(rawVal);
    if (isNaN(val) || !Number.isFinite(val) || !Number.isInteger(val) || val < 0 || rawVal !== String(val)) {
      configErrorMessage.value = t('products.errMinStockInvalid');
      return;
    }
  }

  isSavingConfig.value = true;
  configErrorMessage.value = "";
  try {
    await saveWarehouseStockConfig({
      productId: configForm.productId,
      warehouseId: configForm.warehouseId,
      minStockOverride: val,
    });

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
  const token = ++requestToken.value;
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

    if (token !== requestToken.value) return;

    const content = data.content || [];
    totalPages.value = data.totalPages || 0;
    totalElements.value = data.totalElements || 0;

    // Load defaultMinStock for each unique product concurrently
    const uniqueProductIds = [...new Set(content.map(item => item.productId))];
    const productDetailsResults = await Promise.allSettled(uniqueProductIds.map(id => getProduct(id)));
    const productMap = {};
    uniqueProductIds.forEach((id, index) => {
      if (productDetailsResults[index].status === 'fulfilled') {
        productMap[id] = productDetailsResults[index].value;
      }
    });

    inventoryItems.value = content.map(item => {
      const product = productMap[item.productId];
      const defaultMinStock = product ? product.defaultMinStock : 0;
      // If minStock returned from DB is different from product's defaultMinStock, it's override
      const isOverride = defaultMinStock !== null && item.minStock !== defaultMinStock;
      return {
        ...item,
        defaultMinStock,
        isOverride
      };
    });
  } catch (error) {
    if (token !== requestToken.value) return;
    inventoryItems.value = [];
    errorMessage.value = error.message;
    if (error.status === 401) router.replace("/login");
  } finally {
    if (token === requestToken.value) {
      isLoading.value = false;
    }
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

function tooltipText(row) {
  if (row.status === 'OUT_OF_STOCK') {
    return 'Hết hàng hoàn toàn. Cần nhập hàng khẩn cấp!';
  }
  if (row.status === 'LOW_STOCK') {
    return 'Tồn kho thực tế thấp hơn định mức tồn tối thiểu hiệu lực.';
  }
  return 'Tồn kho ở mức an toàn.';
}

function preventNonInteger(event) {
  const charCode = event.which ? event.which : event.keyCode;
  if (charCode < 48 || charCode > 57) {
    event.preventDefault();
  }
}

function handleIntegerPaste(event) {
  const pasteData = (event.clipboardData || window.clipboardData).getData('text');
  const num = Number(pasteData);
  if (isNaN(num) || !Number.isInteger(num) || num < 0) {
    event.preventDefault();
  }
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
        <span class="tabular-num font-semibold text-slate-800" :class="{ 'text-red-600 font-bold': row.status === 'OUT_OF_STOCK', 'text-amber-600 font-bold': row.status === 'LOW_STOCK' }">
          {{ value ?? 0 }}
        </span>
      </template>
      <template #minStock="{ value, row }">
        <div class="quantity-cell flex items-center justify-between">
          <span class="tabular-num text-slate-700 font-medium">
            {{ value ?? 0 }}
          </span>
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
      <template #thresholdSource="{ row }">
        <span 
          class="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
          :class="row.isOverride ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'"
        >
          {{ row.isOverride ? 'Ghi đè' : 'Mặc định' }}
        </span>
      </template>
      <template #status="{ value, row }">
        <div class="inline-flex items-center gap-1.5" :title="tooltipText(row)">
          <StatusBadge :status="getInventoryStatusLabel(value)" />
          <i 
            v-if="row.status === 'OUT_OF_STOCK' || row.status === 'LOW_STOCK'"
            class="mdi mdi-alert-circle text-amber-500 text-base"
            style="cursor: help;"
          ></i>
        </div>
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
        <div class="inline-flex items-center gap-1.5" :title="tooltipText(row)">
          <StatusBadge :status="getInventoryStatusLabel(row.status)" />
          <i 
            v-if="row.status === 'OUT_OF_STOCK' || row.status === 'LOW_STOCK'"
            class="mdi mdi-alert-circle text-amber-500 text-sm"
          ></i>
        </div>
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
          <span class="detail-label">Số lượng thực tế</span>
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
          <span class="detail-label">Tồn tối thiểu hiệu lực</span>
          <span class="detail-val flex items-center gap-1">
            <span class="tabular-num font-semibold">{{ row.minStock ?? 0 }}</span>
            <span class="text-xs text-slate-400">({{ row.isOverride ? 'Ghi đè' : 'Mặc định' }})</span>
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
  <div v-if="isConfigOpen" class="modal-backdrop" @click.self="closeConfigModal">
    <div class="modal w-full max-w-md card card-pad">
      <form @submit.prevent="submitConfigForm" class="flex flex-col gap-4">
        <div class="modal-head flex items-center justify-between border-b pb-3 mb-2">
          <h2 class="section-title" style="font-size: 18px; font-weight: 700;">Cấu hình tồn tối thiểu</h2>
          <button class="btn btn-icon text-slate-400 hover:text-slate-600" type="button" @click="closeConfigModal" :disabled="isSavingConfig">
            <i class="mdi mdi-close text-xl"></i>
          </button>
        </div>

        <div class="modal-body flex flex-col gap-4">
          <div v-if="configErrorMessage" class="form-alert form-alert-error py-2 px-3 bg-red-50 text-red-600 rounded text-sm font-semibold">
            {{ configErrorMessage }}
          </div>

          <div class="field">
            <label class="field-label font-semibold text-slate-700 block mb-1" style="font-weight: 700;">Sản phẩm</label>
            <input
              type="text"
              class="input bg-slate-100 cursor-not-allowed"
              :value="configForm.productCode + ' - ' + configForm.productName"
              disabled
            />
          </div>

          <div class="field">
            <label class="field-label font-semibold text-slate-700 block mb-1" style="font-weight: 700;">Kho hàng</label>
            <input
              type="text"
              class="input bg-slate-100 cursor-not-allowed"
              :value="configForm.warehouseName"
              disabled
            />
          </div>

          <!-- Default stock information -->
          <div class="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded text-sm text-blue-800 dark:text-blue-200 flex justify-between items-center" style="border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span>Tồn tối thiểu mặc định sản phẩm:</span>
            <strong class="text-base" style="font-size: 16px;">{{ configForm.defaultMinStock }}</strong>
          </div>

          <!-- Configuration Choice -->
          <div class="field flex flex-col gap-2" style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
            <span class="field-label font-semibold text-slate-700 block" style="font-weight: 700;">Cấu hình định mức</span>
            
            <div class="flex items-center gap-2" style="display: flex; align-items: center; gap: 8px;">
              <input
                type="radio"
                id="use-default"
                :value="true"
                v-model="configForm.useDefault"
                :disabled="isSavingConfig"
                style="width: 18px; height: 18px; cursor: pointer;"
              />
              <label for="use-default" class="text-sm cursor-pointer select-none font-medium text-slate-700" style="cursor: pointer; user-select: none;">
                Sử dụng tồn tối thiểu mặc định ({{ configForm.defaultMinStock }})
              </label>
            </div>

            <div class="flex items-center gap-2" style="display: flex; align-items: center; gap: 8px;">
              <input
                type="radio"
                id="use-override"
                :value="false"
                v-model="configForm.useDefault"
                :disabled="isSavingConfig"
                style="width: 18px; height: 18px; cursor: pointer;"
              />
              <label for="use-override" class="text-sm cursor-pointer select-none font-medium text-slate-700" style="cursor: pointer; user-select: none;">
                Ghi đè định mức tồn tối thiểu riêng cho kho này
              </label>
            </div>
          </div>

          <!-- Override input field -->
          <div class="field mt-1" v-if="!configForm.useDefault" style="margin-top: 8px;">
            <label class="field-label font-semibold text-slate-700 block mb-1" style="font-weight: 700;">Giá trị định mức ghi đè *</label>
            <input
              v-model="configForm.overrideValue"
              class="input"
              type="text"
              required
              :disabled="isSavingConfig"
              placeholder="Nhập định mức tồn tối thiểu..."
              @keypress="preventNonInteger"
              @paste="handleIntegerPaste"
            />
            <small class="field-note text-slate-400 block mt-1" style="color: var(--muted); font-size: 12px;">Định mức này chỉ áp dụng riêng tại kho {{ configForm.warehouseName }}.</small>
          </div>
        </div>

        <div class="modal-foot flex justify-end gap-3 mt-4 pt-3 border-t" style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-color, #e4e4e7); padding-top: 12px; margin-top: 12px;">
          <button
            class="btn"
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
