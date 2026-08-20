<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from 'vue-i18n';
import PageHeader from "../components/PageHeader.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import DataTable from "../components/DataTable.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import SearchableSelect from "../components/SearchableSelect.vue";
import { getInventoryTransactions } from "../services/inventoryService";
import { getWarehouses } from "../services/warehouseService";

const router = useRouter();
const { t } = useI18n();
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
  { value: "", label: t("transactions.allTransactionTypes") },
  { value: "NHAP_KHO", label: t("transactions.inbound") },
  { value: "XUAT_KHO", label: t("transactions.outbound") },
  { value: "NHAP_DAU_KY", label: t("transactions.initialInbound") },
  { value: "DIEU_CHINH_TANG", label: t("transactions.adjustIncrease") },
  { value: "DIEU_CHINH_GIAM", label: t("transactions.adjustDecrease") },
  { value: "DIEU_CHINH_KIEM_KE", label: t("transactions.adjustCount") },
];

const columns = [
  { key: "createdAt", label: t("transactions.createdAt"), class: "cell-nowrap" },
  { key: "transactionType", label: t("transactions.transactionType"), class: "cell-nowrap" },
  { key: "product", label: t("transactions.product"), class: "cell-long" },
  { key: "warehouseName", label: t("transactions.warehouse"), class: "cell-medium" },
  { key: "delta", label: t("transactions.delta"), class: "cell-compact text-right" },
  { key: "transition", label: t("transactions.transition"), class: "cell-compact text-right tabular-num" },
  { key: "reference", label: t("transactions.reference"), class: "cell-medium" },
  { key: "createdByName", label: t("transactions.createdBy"), class: "cell-medium" },
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

const warehouseOptions = computed(() => {
  return [
    { value: "", label: isLoadingDropdowns.value ? t('transactions.loadingWarehouses') : t('transactions.allWarehouses') },
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

const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);

// KPI stats calculated dynamically based on currently loaded transactions page
const inboundCount = computed(() => {
  return transactions.value.filter(t => ['NHAP_KHO', 'NHAP_DAU_KY', 'DIEU_CHINH_TANG'].includes(t.transactionType)).length;
});

const outboundCount = computed(() => {
  return transactions.value.filter(t => ['XUAT_KHO', 'DIEU_CHINH_GIAM'].includes(t.transactionType)).length;
});

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
  return transactionTypeOptions.find((option) => option.value === type)?.label || t("transactions.unknown");
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

function viewDocumentDetail(type, documentId) {
  const path = type === 'in' ? `/stock-in/${documentId}` : `/stock-out/${documentId}`;
  router.push(path);
}
</script>

<template>
  <div class="page-container page-shell">
    <PageHeader
      :title="t('transactions.title')"
      :description="t('transactions.description')"
    />

    <!-- KPI Summary Cards -->
    <div class="summary-metrics-grid animate-in fade-in duration-200">
      <div class="metric-card card card-pad">
        <span class="metric-label">{{ t("transactions.totalTransactions") }}</span>
        <span class="metric-value text-blue-600 font-semibold">{{ totalElements }}</span>
      </div>
      <div class="metric-card card card-pad bg-emerald-50/50">
        <span class="metric-label">{{ t("transactions.inboundCount") }}</span>
        <span class="metric-value text-emerald-600 font-semibold">{{ inboundCount }}</span>
      </div>
      <div class="metric-card card card-pad bg-zinc-50/55">
        <span class="metric-label">{{ t("transactions.outboundCount") }}</span>
        <span class="metric-value text-zinc-700 font-semibold">{{ outboundCount }}</span>
      </div>
    </div>

    <!-- Filters Bar -->
    <SearchFilterBar
      v-model="searchDraft"
      :placeholder="t('transactions.searchPlaceholder')"
      @keyup.enter="applySearch"
    >
      <select v-model="filters.transactionType" class="select" :disabled="isLoading" @change="applyFilter">
        <option v-for="option in transactionTypeOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <SearchableSelect
        v-model="filters.warehouseId"
        :options="warehouseOptions"
        :placeholder="t('transactions.allWarehouses')"
        :disabled="isLoadingDropdowns || isLoading"
        @change="applyFilter"
      />

      <div class="date-filter-group">
        <input
          v-model="filters.from"
          type="datetime-local"
          class="input"
          :disabled="isLoading"
          @change="applyFilter"
          :aria-label="t('transactions.fromDate')"
        />
        <span class="date-range-sep">{{ t("transactions.to") }}</span>
        <input
          v-model="filters.to"
          type="datetime-local"
          class="input"
          :disabled="isLoading"
          @change="applyFilter"
          :aria-label="t('transactions.toDate')"
        />
      </div>

      <div class="filter-actions">
        <button class="btn btn-primary" type="button" :disabled="isLoading" @click="applySearch">
          <i class="mdi mdi-magnify"></i>
          {{ t("transactions.search") }}
        </button>
        <button v-if="hasActiveFilters" class="btn btn-ghost" type="button" :disabled="isLoading" @click="clearFilters">
          <i class="mdi mdi-filter-remove-outline"></i>
          {{ t("transactions.clearFilter") }}
        </button>
      </div>
    </SearchFilterBar>

    <!-- Error box -->
    <p v-if="errorMessage" class="error-alert card card-pad">
      <i class="mdi mdi-alert-circle text-lg"></i>
      <span>{{ errorMessage }}</span>
    </p>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state card card-pad">
      <i class="mdi mdi-loading mdi-spin text-2xl text-blue-600"></i>
      <span>{{ t("transactions.loadingHistory") }}</span>
    </div>

    <!-- Main Content Container -->
    <div v-else-if="transactions.length > 0">
      <!-- Desktop Table -->
      <div class="inventory-desktop-table animate-in fade-in duration-200">
        <DataTable :columns="columns" :rows="transactions" min-width="1200px">
          <template #createdAt="{ value }">
            <span class="tabular-num text-xs">{{ formatDate(value) }}</span>
          </template>
          <template #transactionType="{ row }">
            <StatusBadge :status="getTransactionTypeLabel(row.transactionType)" />
          </template>
          <template #product="{ row }">
            <div class="product-cell">
              <div class="product-thumbnail">
                <i class="mdi mdi-package-variant-closed"></i>
              </div>
              <div class="product-info">
                <span class="product-name font-semibold text-zinc-900">{{ row.productName }}</span>
                <code class="sku-code text-xs w-fit">{{ row.productCode }}</code>
              </div>
            </div>
          </template>
          <template #warehouseName="{ row }">{{ displayWarehouseName(row) }}</template>
          <template #delta="{ row }">
            <span
              :class="Number(getDelta(row)) >= 0 ? 'delta-up font-semibold' : 'delta-down-neutral font-medium'"
            >
              {{ getDelta(row) }}
            </span>
          </template>
          <template #transition="{ row }">
            <span class="text-zinc-500 font-medium">
              {{ row.quantityBefore ?? 0 }} → {{ row.quantityAfter ?? 0 }}
            </span>
          </template>
          <template #reference="{ row }">
            <div class="reference-cell">
              <template v-if="row.importReceiptId">
                <span
                  class="document-link"
                  @click="viewDocumentDetail('in', row.importReceiptId)"
                >
                  <i class="mdi mdi-receipt-text-outline"></i> {{ t("transactions.importReceipt") }} #{{ row.importReceiptId }}
                </span>
              </template>
              <template v-else-if="row.exportReceiptId">
                <span
                  class="document-link"
                  @click="viewDocumentDetail('out', row.exportReceiptId)"
                >
                  <i class="mdi mdi-receipt-text-send-outline"></i> {{ t("transactions.exportReceipt") }} #{{ row.exportReceiptId }}
                </span>
              </template>
              <span v-else class="note-text">{{ row.note || '—' }}</span>
            </div>
          </template>
        </DataTable>
      </div>

      <!-- Mobile List View -->
      <div class="inventory-mobile-list animate-in fade-in duration-200">
        <div v-for="row in transactions" :key="row.id" class="mobile-transaction-card card card-pad">
          <div class="card-header-row">
            <span class="transaction-date">{{ formatDate(row.createdAt) }}</span>
            <StatusBadge :status="getTransactionTypeLabel(row.transactionType)" />
          </div>

          <div class="card-body-details">
            <div class="detail-row">
              <span class="detail-label">{{ t("transactions.product") }}</span>
              <span class="detail-val text-zinc-900">{{ row.productName }} <code class="sku-code ml-1 text-xs">{{ row.productCode }}</code></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ t("transactions.warehouse") }}</span>
              <span class="detail-val">{{ displayWarehouseName(row) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ t("transactions.delta") }}</span>
              <span
                class="detail-val tabular-num font-semibold"
                :class="Number(getDelta(row)) >= 0 ? 'text-emerald-600' : 'text-zinc-700'"
              >
                {{ getDelta(row) }} ({{ row.quantityBefore ?? 0 }} → {{ row.quantityAfter ?? 0 }})
              </span>
            </div>
            <div class="detail-row" v-if="row.importReceiptId || row.exportReceiptId || row.note">
              <span class="detail-label">{{ t("transactions.originalDocument") }}</span>
              <span class="detail-val">
                <template v-if="row.importReceiptId">
                  <span class="document-link" @click="viewDocumentDetail('in', row.importReceiptId)">
                    {{ t("transactions.importReceipt") }} #{{ row.importReceiptId }}
                  </span>
                </template>
                <template v-else-if="row.exportReceiptId">
                  <span class="document-link" @click="viewDocumentDetail('out', row.exportReceiptId)">
                    {{ t("transactions.exportReceipt") }} #{{ row.exportReceiptId }}
                  </span>
                </template>
                <template v-else>
                  <span class="note-text">{{ row.note }}</span>
                </template>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ t("transactions.createdBy") }}</span>
              <span class="detail-val text-xs text-muted">{{ row.createdByName }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination-bar card card-pad">
        <span class="muted">{{ totalElements }} {{ t("transactions.records") }}</span>
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
          <span class="page-indicator">{{ t("transactions.page") }} {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span>
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
        :title="t('transactions.noResultsTitle')"
        :description="t('transactions.noResultsDesc')"
        icon="mdi-filter-off-outline"
      />
      <EmptyState
        v-else
        :title="t('transactions.noTransactionsTitle')"
        :description="t('transactions.noTransactionsDesc')"
        icon="mdi-history"
      />
    </div>
  </div>
</template>

<style scoped>
.date-filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-range-sep {
  color: var(--color-text-secondary);
  font-size: 12px;
}

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

/* KPI Summary Cards */
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

/* Table cells formatting */
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

.sku-code {
  font-family: monospace;
  font-size: 12px;
  padding: 2px 6px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.delta-up {
  color: var(--color-success);
}

.delta-down-neutral {
  color: var(--color-text-primary);
}

.document-link {
  color: var(--color-action-primary);
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 150ms ease;
}

.document-link:hover {
  color: var(--color-action-primary-hover);
  text-decoration: underline;
}

.note-text {
  color: var(--color-text-secondary);
  font-size: 13px;
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

.date-filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  grid-column: span 2;
}

.date-filter-group .input {
  flex: 1;
  min-width: 120px;
}

.date-range-sep {
  color: var(--color-text-secondary);
  font-weight: 500;
  padding: 0 4px;
}

/* Mobile transaction log responsive list */
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
  .mobile-transaction-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 10px;
  }
  .transaction-date {
    font-size: 12px;
    color: var(--color-text-secondary);
    font-variant-numeric: tabular-nums;
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
  .date-filter-group {
    grid-column: span 1;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
  .date-range-sep {
    text-align: center;
    padding: 2px 0;
  }
  .filter-actions, .filter-actions .btn {
    width: 100%;
  }
}
</style>
