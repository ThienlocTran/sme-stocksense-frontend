<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { getLowStockInventory } from "../services/inventoryService";
import { getWarehouses } from "../services/warehouseService";

const router = useRouter();
const { t } = useI18n();
const alerts = ref([]);
const warehouses = ref([]);
const isLoading = ref(false);
const isLoadingDropdowns = ref(false);
const errorMessage = ref("");
const dropdownErrorMessage = ref("");
const searchDraft = ref("");
const searchKeyword = ref("");
const page = ref(0);
const size = ref(20);
const totalPages = ref(0);
const totalElements = ref(0);
const filters = reactive({ warehouseId: "", warehouseStatus: "" });
const fetchRequestId = ref(0);
const latestRequestId = ref(0);
const dropdownRequestId = ref(0);
const latestDropdownRequestId = ref(0);

const columns = [
  { key: "productCode", label: t("alerts.table.productCode"), class: "cell-compact font-semibold text-zinc-900" },
  { key: "productName", label: t("alerts.table.productName"), class: "cell-long" },
  { key: "warehouse", label: t("alerts.table.warehouse"), class: "cell-medium" },
  { key: "currentQuantity", label: t("alerts.table.currentQuantity"), class: "cell-medium text-right" },
  { key: "severity", label: t("alerts.table.severity"), class: "cell-compact text-center" },
  { key: "status", label: t("alerts.table.status"), class: "cell-nowrap" },
  { key: "lastUpdatedAt", label: t("alerts.table.lastUpdatedAt"), class: "cell-nowrap" },
  { key: "actions", label: t("alerts.table.actions"), class: "cell-compact text-right" },
];

const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);
const hasActiveFilters = computed(() => {
  return (
    searchKeyword.value.trim() !== "" ||
    filters.warehouseId !== "" ||
    filters.warehouseStatus !== ""
  );
});

// Dynamic Page Metrics
const criticalCount = computed(() => {
  return alerts.value.filter((a) => Number(a.currentQuantity ?? 0) === 0).length;
});

const warningCount = computed(() => {
  return alerts.value.filter((a) => {
    const cur = Number(a.currentQuantity ?? 0);
    const min = Number(a.minStock ?? 0);
    return cur > 0 && cur < min;
  }).length;
});

onMounted(async () => {
  const loaded = await loadDropdowns(filters.warehouseStatus);
  if (loaded) {
    fetchAlerts();
  }
});

async function loadDropdowns(status = "") {
  const requestId = ++dropdownRequestId.value;
  latestDropdownRequestId.value = requestId;

  isLoadingDropdowns.value = true;
  dropdownErrorMessage.value = "";

  try {
    const data = await getWarehouses({ status: status || undefined });
    if (requestId !== latestDropdownRequestId.value) {
      return false;
    }

    warehouses.value = data;
    return true;
  } catch (error) {
    if (requestId !== latestDropdownRequestId.value) {
      return false;
    }

    warehouses.value = [];
    dropdownErrorMessage.value = error.message;
    if (error.status === 401) {
      router.replace("/login");
    }
    return false;
  } finally {
    if (requestId === latestDropdownRequestId.value) {
      isLoadingDropdowns.value = false;
    }
  }
}

async function fetchAlerts() {
  if (dropdownErrorMessage.value) {
    return;
  }

  const requestId = ++fetchRequestId.value;
  latestRequestId.value = requestId;

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const data = await getLowStockInventory({
      page: page.value,
      size: size.value,
      keyword: searchKeyword.value.trim(),
      warehouseId: filters.warehouseId,
      warehouseStatus: filters.warehouseStatus,
    });

    if (requestId !== latestRequestId.value) {
      return;
    }

    alerts.value = data.content || [];
    totalPages.value = data.totalPages || 0;
    totalElements.value = data.totalElements || 0;
  } catch (error) {
    if (requestId !== latestRequestId.value) {
      return;
    }

    alerts.value = [];
    errorMessage.value = error.message;
    if (error.status === 401) {
      router.replace("/login");
    }
  } finally {
    if (requestId === latestRequestId.value) {
      isLoading.value = false;
    }
  }
}

async function applySearch() {
  page.value = 0;
  searchKeyword.value = searchDraft.value.trim();
  await fetchAlerts();
}

async function applyFilter() {
  page.value = 0;
  const loaded = await loadDropdowns(filters.warehouseStatus);

  if (!loaded) {
    return;
  }

  if (
    filters.warehouseId &&
    !warehouses.value.some((warehouse) => warehouse.id === filters.warehouseId)
  ) {
    filters.warehouseId = "";
  }

  await fetchAlerts();
}

async function clearFilters() {
  searchDraft.value = "";
  searchKeyword.value = "";
  filters.warehouseId = "";
  filters.warehouseStatus = "";
  page.value = 0;

  const loaded = await loadDropdowns();
  if (loaded) {
    await fetchAlerts();
  }
}

function displayWarehouseName(row) {
  return row.warehouseCode
    ? `${row.warehouseCode} - ${row.warehouse}`
    : row.warehouse || "-";
}

function formatInventoryStatus(status) {
  if (status === "LOW_STOCK") return t("alerts.status.lowStock");
  if (status === "OUT_OF_STOCK") return t("alerts.status.outOfStock");
  if (status === "NORMAL") return t("alerts.status.normal");
  if (status === "OVER_STOCK") return t("alerts.status.overStock");
  return status || "-";
}

function computeSeverity(row) {
  const current = Number(row.currentQuantity ?? 0);
  if (current <= 0) {
    return "CRITICAL";
  }
  return "WARNING";
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", { hour12: false });
}

function previousPage() {
  if (!hasPreviousPage.value) return;
  page.value -= 1;
  fetchAlerts();
}

function nextPage() {
  if (!hasNextPage.value) return;
  page.value += 1;
  fetchAlerts();
}

function navigateToInventory(row) {
  router.push({
    path: "/inventory",
    query: {
      warehouseId: row.warehouseId,
      keyword: row.productCode,
    },
  });
}
</script>

<template>
  <div class="page-container page-shell">
    <PageHeader
      :title="t('alerts.title')"
      :description="t('alerts.description')"
    />

    <!-- KPI Summary Metrics widgets -->
    <div class="summary-metrics-grid animate-in fade-in duration-200">
      <div class="metric-card card card-pad">
        <span class="metric-label">{{ t("alerts.metrics.total") }}</span>
        <span class="metric-value text-blue-600 font-semibold">{{ totalElements }}</span>
      </div>
      <div class="metric-card card card-pad bg-rose-50/50">
        <span class="metric-label">{{ t("alerts.metrics.critical") }}</span>
        <span class="metric-value text-red-600 font-semibold">{{ criticalCount }}</span>
      </div>
      <div class="metric-card card card-pad bg-amber-50/50">
        <span class="metric-label">{{ t("alerts.metrics.warning") }}</span>
        <span class="metric-value text-amber-600 font-semibold">{{ warningCount }}</span>
      </div>
    </div>

    <!-- Search and Filter Bar -->
    <SearchFilterBar
      v-model="searchDraft"
      :placeholder="t('alerts.searchPlaceholder')"
      @keyup.enter="applySearch"
    >
      <select
        v-model="filters.warehouseId"
        class="select"
        :disabled="isLoadingDropdowns || isLoading"
        @change="applyFilter"
      >
        <option value="">
          {{ isLoadingDropdowns ? t("alerts.filter.loadingWarehouse") : t("alerts.filter.allWarehouse") }}
        </option>
        <option
          v-for="warehouse in warehouses"
          :key="warehouse.id"
          :value="warehouse.id"
        >
          {{
            `${warehouse.maKho || warehouse.code || ""}${warehouse.tenKho || warehouse.name ? " - " : ""}${warehouse.tenKho || warehouse.name || ""}`
          }}
        </option>
      </select>

      <select
        v-model="filters.warehouseStatus"
        class="select"
        :disabled="isLoading || isLoadingDropdowns"
        @change="applyFilter"
      >
        <option value="">{{ t("alerts.filter.allStatus") }}</option>
        <option value="HOAT_DONG">{{ t("alerts.filter.active") }}</option>
        <option value="NGUNG_HOAT_DONG">{{ t("alerts.filter.inactive") }}</option>
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

    <!-- Error/Alert boxes -->
    <p v-if="dropdownErrorMessage" class="error-alert card card-pad">
      <i class="mdi mdi-alert-circle text-lg"></i>
      <span>{{ dropdownErrorMessage }}</span>
    </p>
    <p v-else-if="errorMessage" class="error-alert card card-pad">
      <i class="mdi mdi-alert-circle text-lg"></i>
      <span>{{ errorMessage }}</span>
    </p>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state card card-pad">
      <i class="mdi mdi-loading mdi-spin text-2xl text-blue-600"></i>
      <span>{{ t("alerts.loading") }}</span>
    </div>

    <!-- Main Content Container -->
    <div v-else-if="alerts.length > 0">
      <!-- Desktop Table -->
      <div class="inventory-desktop-table animate-in fade-in duration-200">
        <DataTable
          :columns="columns"
          :rows="alerts"
          min-width="1200px"
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
          <template #warehouse="{ row }">{{ displayWarehouseName(row) }}</template>
          <template #currentQuantity="{ row }">
            <div class="quantity-cell text-right">
              <span
                class="tabular-num font-semibold"
                :class="row.status === 'OUT_OF_STOCK' ? 'text-red-600 font-bold' : 'text-amber-600 font-bold'"
              >
                {{ row.currentQuantity ?? 0 }}
              </span>
              <span class="threshold-hint">/ {{ t("alerts.table.minStock") }} {{ row.minStock }}</span>
            </div>
          </template>
          <template #severity="{ row }">
            <div class="text-center">
              <StatusBadge :status="computeSeverity(row)" variant="severity" />
            </div>
          </template>
          <template #status="{ row }">
            <StatusBadge :status="formatInventoryStatus(row.status)" />
          </template>
          <template #lastUpdatedAt="{ value }">
            <span class="tabular-num text-xs">{{ formatDate(value) }}</span>
          </template>
          <template #actions="{ row }">
            <div class="text-right">
              <button
                class="btn btn-secondary btn-sm flex items-center gap-1 ml-auto"
                @click="navigateToInventory(row)"
                :title="t('alerts.table.viewInventoryTitle')"
              >
                <i class="mdi mdi-eye-outline"></i>
                Xem tồn kho
              </button>
            </div>
          </template>
        </DataTable>
      </div>

      <!-- Mobile List Cards -->
      <div class="inventory-mobile-list animate-in fade-in duration-200">
        <div v-for="row in alerts" :key="row.id || row.productCode" class="mobile-alert-card card card-pad">
          <div class="card-header-row">
            <div class="product-cell">
              <div class="product-thumbnail">
                <i class="mdi mdi-package-variant-closed"></i>
              </div>
              <div class="product-info">
                <span class="product-name font-semibold text-zinc-900">{{ row.productName }}</span>
                <code class="sku-code text-xs w-fit">{{ row.productCode }}</code>
              </div>
            </div>
            <StatusBadge :status="formatInventoryStatus(row.status)" />
          </div>

          <div class="card-body-details">
            <div class="detail-row">
              <span class="detail-label">{{ t("alerts.table.warehouse") }}</span>
              <span class="detail-val">{{ displayWarehouseName(row) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ t("alerts.table.currentQuantityLabel") }}</span>
              <span
                class="detail-val tabular-num font-semibold"
                :class="row.status === 'OUT_OF_STOCK' ? 'text-red-600' : 'text-amber-600'"
              >
                {{ row.currentQuantity ?? 0 }} / tối thiểu {{ row.minStock }}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ t("alerts.table.severity") }}</span>
              <span class="detail-val"><StatusBadge :status="computeSeverity(row)" variant="severity" /></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ t("alerts.table.lastUpdatedAt") }}</span>
              <span class="detail-val text-muted text-xs">{{ formatDate(row.lastUpdatedAt) }}</span>
            </div>
          </div>

          <div class="card-footer-action">
            <button
              class="btn btn-secondary btn-sm w-full justify-center gap-1"
              @click="navigateToInventory(row)"
            >
              <i class="mdi mdi-eye-outline"></i>
              Xem tồn kho
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination bar -->
      <div class="pagination-bar card card-pad">
        <span class="muted">{{ totalElements }} {{ t("alerts.pagination.records") }}</span>
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
          <span class="page-indicator">{{ t("alerts.pagination.page") }} {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span>
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
    </div>

    <!-- Empty State -->
    <div v-else>
      <EmptyState
        v-if="hasActiveFilters"
        :title="t('alerts.empty.filteredTitle')"
        :description="t('alerts.empty.filteredDesc')"
        icon="mdi-filter-off-outline"
      />
      <EmptyState
        v-else
        :title="t('alerts.empty.safeTitle')"
        :description="t('alerts.empty.safeDesc')"
        icon="mdi-check-circle-outline"
      />
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

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.error-alert {
  background: var(--color-danger-soft);
  border: 1px solid rgba(220, 38, 38, 0.2);
  color: var(--color-danger);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ml-auto {
  margin-left: auto;
}

/* KPI Summary Grid */
.summary-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--color-border);
  transition: border-color 150ms ease;
}

.metric-card:hover {
  border-color: var(--color-border-strong);
}

.metric-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.metric-value {
  font-size: 26px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Table Cells Formatting */
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

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

.tabular-num {
  font-variant-numeric: tabular-nums;
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
  color: var(--color-text-primary);
  white-space: nowrap;
}

/* Mobile alerts list responsive elements */
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
    margin-bottom: 16px;
  }
  .mobile-alert-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 10px;
  }
  .card-body-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }
  .detail-label {
    color: var(--color-text-secondary);
  }
  .detail-val {
    font-weight: 600;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
  }
  .card-footer-action {
    border-top: 1px solid var(--color-border);
    padding-top: 10px;
  }
  .filter-actions, .filter-actions .btn {
    width: 100%;
  }
}
</style>
