<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { getReplenishmentSuggestions } from "../services/replenishmentService";
import { getWarehouses } from "../services/warehouseService";

const router = useRouter();
const { t } = useI18n();
const suggestions = ref([]);
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
const filters = reactive({ warehouseId: "" });
const fetchRequestId = ref(0);
const latestRequestId = ref(0);
const dropdownRequestId = ref(0);
const latestDropdownRequestId = ref(0);

const columns = computed(() => [
  { key: "product", label: t("replenishment.table.product"), class: "cell-medium font-semibold" },
  { key: "warehouse", label: t("replenishment.table.warehouse"), class: "cell-medium" },
  { key: "stockInfo", label: t("replenishment.table.stockInfo"), class: "cell-medium text-right" },
  { key: "shortage", label: t("replenishment.table.shortage"), class: "cell-compact text-right" },
  { key: "suggested", label: t("replenishment.table.suggested"), class: "cell-compact text-right" },
  { key: "priority", label: t("replenishment.table.priority"), class: "cell-compact text-center" },
  { key: "reason", label: t("replenishment.table.reason"), class: "cell-medium" },
]);

const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);
const hasActiveFilters = computed(() => {
  return (
    searchKeyword.value.trim() !== "" ||
    filters.warehouseId !== ""
  );
});

onMounted(async () => {
  const loaded = await loadDropdowns();
  if (loaded) {
    fetchSuggestions();
  }
});

async function loadDropdowns() {
  const requestId = ++dropdownRequestId.value;
  latestDropdownRequestId.value = requestId;

  isLoadingDropdowns.value = true;
  dropdownErrorMessage.value = "";

  try {
    const data = await getWarehouses({ status: "HOAT_DONG" });
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
    dropdownErrorMessage.value = error.message || t("common.error");
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

async function fetchSuggestions() {
  const requestId = ++fetchRequestId.value;
  latestRequestId.value = requestId;

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const response = await getReplenishmentSuggestions({
      page: page.value,
      size: size.value,
      keyword: searchKeyword.value || undefined,
      warehouseId: filters.warehouseId || undefined,
    });

    if (requestId !== latestRequestId.value) {
      return;
    }

    suggestions.value = response.content || [];
    totalPages.value = response.totalPages || 0;
    totalElements.value = response.totalElements || 0;
  } catch (error) {
    if (requestId !== latestRequestId.value) {
      return;
    }

    suggestions.value = [];
    totalPages.value = 0;
    totalElements.value = 0;
    errorMessage.value = error.message || t("common.error");
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
  await fetchSuggestions();
}

async function applyFilter() {
  page.value = 0;
  await fetchSuggestions();
}

async function clearFilters() {
  searchDraft.value = "";
  searchKeyword.value = "";
  filters.warehouseId = "";
  page.value = 0;
  await fetchSuggestions();
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
</script>

<template>
  <PageHeader
    :title="t('replenishment.title')"
    :description="t('replenishment.description')"
  />

  <div v-if="errorMessage" class="error-alert card card-pad">
    <i class="mdi mdi-alert-circle-outline"></i>
    <span>{{ errorMessage }}</span>
  </div>

  <SearchFilterBar
    v-model="searchDraft"
    :placeholder="t('replenishment.searchPlaceholder')"
    @keyup.enter="applySearch"
  >
    <select
      v-model="filters.warehouseId"
      class="select"
      :disabled="isLoading || isLoadingDropdowns"
      @change="applyFilter"
    >
      <option value="">{{ t("replenishment.filters.allWarehouses") }}</option>
      <option
        v-for="warehouse in warehouses"
        :key="warehouse.id"
        :value="warehouse.id"
      >
        {{ warehouse.maKho }} - {{ warehouse.tenKho }}
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
        {{ t("replenishment.filters.searchBtn") }}
      </button>
      <button
        v-if="hasActiveFilters"
        class="btn btn-ghost"
        type="button"
        :disabled="isLoading"
        @click="clearFilters"
      >
        <i class="mdi mdi-filter-remove-outline"></i>
        {{ t("replenishment.filters.clearFiltersBtn") }}
      </button>
    </div>
  </SearchFilterBar>

  <div class="table-container">
    <div v-if="isLoading" class="state-card state-card--loading">
      <div class="state-card__icon">
        <i class="mdi mdi-loading mdi-spin"></i>
      </div>
      <div class="state-card__body">
        <h3>{{ t("replenishment.loading") }}</h3>
      </div>
    </div>

    <div v-else-if="suggestions.length > 0">
      <div class="desktop-table">
        <DataTable :columns="columns" :rows="suggestions" min-width="950px">
          <template #product="{ row }">
            <div class="product-cell">
              <span class="product-name font-semibold text-slate-800">{{ row.productName }}</span>
              <code class="sku-code text-xs text-slate-500">{{ row.productCode }}</code>
            </div>
          </template>
          
          <template #warehouse="{ row }">
            <span class="warehouse-name text-slate-700">
              {{ row.warehouseCode }} - {{ row.warehouseName }}
            </span>
          </template>

          <template #stockInfo="{ row }">
            <div class="stock-info-cell text-right text-slate-700">
              <strong class="text-sm">{{ row.currentStock }}</strong>
              <span class="text-slate-400 mx-1">/</span>
              <span class="text-xs text-slate-500">
                {{ row.minStock }} - {{ row.maxStock ?? '∞' }}
              </span>
            </div>
          </template>

          <template #shortage="{ row }">
            <div class="text-right">
              <span v-if="row.shortageQuantity > 0" class="text-sm text-red-600 font-semibold tabular-nums">
                -{{ row.shortageQuantity }}
              </span>
              <span v-else class="text-sm text-slate-400">0</span>
            </div>
          </template>

          <template #suggested="{ row }">
            <div class="text-right flex flex-col items-end gap-1">
              <div v-if="row.capacityLimited" class="flex flex-col items-end">
                <span class="text-xs text-slate-400 line-through tabular-nums">+{{ row.suggestedQuantity }}</span>
                <strong class="text-sm text-amber-600 font-bold tabular-nums flex items-center gap-1">
                  <i class="mdi mdi-alert-circle text-amber-500"></i>
                  +{{ row.capacityAllowedQuantity }}
                </strong>
              </div>
              <div v-else>
                <strong v-if="row.suggestedQuantity > 0" class="text-sm text-emerald-700 font-bold tabular-nums">
                  +{{ row.suggestedQuantity }}
                </strong>
                <span v-else class="text-sm text-slate-400">0</span>
              </div>
            </div>
          </template>

          <template #priority="{ row }">
            <div class="text-center">
              <StatusBadge :status="row.priority" variant="severity" />
            </div>
          </template>

          <template #reason="{ row }">
            <div class="flex flex-col gap-1">
              <span class="text-sm text-slate-700">
                {{ t('replenishment.reason.' + row.reason) }}
              </span>
              <div v-if="row.configurationWarning" class="cap-warning-hint text-xs flex items-start gap-1 p-1 rounded mt-1 border" :class="row.configurationWarning === 'UNIT_VOLUME_NOT_CONFIGURED' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-800 border-amber-100'">
                <i class="mdi mdi-alert-circle-outline mr-0.5 mt-0.5"></i>
                <span>
                  {{ row.configurationWarning === 'UNIT_VOLUME_NOT_CONFIGURED' ? 'Sản phẩm chưa được cấu hình thể tích đơn vị.' : row.configurationWarning }}
                </span>
              </div>
            </div>
          </template>
        </DataTable>
      </div>

      <!-- Mobile list view -->
      <div class="mobile-list">
        <div 
          v-for="item in suggestions" 
          :key="`${item.productId}-${item.warehouseId}`"
          class="mobile-item card card-pad mb-3"
        >
          <div class="mobile-item-header flex items-center justify-between border-b pb-2 mb-2">
            <div>
              <h4 class="font-bold text-slate-800">{{ item.productName }}</h4>
              <code class="text-xs text-slate-500">{{ item.productCode }}</code>
            </div>
            <StatusBadge :status="item.priority" variant="severity" />
          </div>
          <div class="mobile-item-body grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div>
              <strong>{{ t('replenishment.table.warehouse') }}:</strong>
              <p>{{ item.warehouseName }}</p>
            </div>
            <div>
              <strong>{{ t('replenishment.table.reason') }}:</strong>
              <p>{{ t('replenishment.reason.' + item.reason) }}</p>
            </div>
            <div>
              <strong>{{ t('replenishment.table.stockInfo') }}:</strong>
              <p>{{ item.currentStock }} / {{ item.minStock }} - {{ item.maxStock ?? '∞' }}</p>
            </div>
            <div class="flex flex-col items-end justify-center">
              <span class="text-red-600" v-if="item.shortageQuantity > 0">
                Thiếu hụt: <strong>-{{ item.shortageQuantity }}</strong>
              </span>
              <div v-if="item.capacityLimited" class="flex flex-col items-end">
                <span class="text-slate-400 text-[10px] line-through">Đề xuất: +{{ item.suggestedQuantity }}</span>
                <span class="text-amber-600 font-bold">Duyệt: +{{ item.capacityAllowedQuantity }}</span>
              </div>
              <span class="text-emerald-700 font-semibold" v-else-if="item.suggestedQuantity > 0">
                Đề xuất: <strong>+{{ item.suggestedQuantity }}</strong>
              </span>
            </div>
          </div>
          <div v-if="item.configurationWarning" class="mt-2 text-[11px] p-1.5 rounded border" :class="item.configurationWarning === 'UNIT_VOLUME_NOT_CONFIGURED' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-800 border-amber-100'">
            <i class="mdi mdi-alert-circle-outline mr-0.5"></i>
            {{ item.configurationWarning === 'UNIT_VOLUME_NOT_CONFIGURED' ? 'Sản phẩm chưa được cấu hình thể tích đơn vị.' : item.configurationWarning }}
          </div>
        </div>
      </div>

      <!-- Pagination bar -->
      <div class="pagination-bar card card-pad mt-4">
        <span class="muted">{{ totalElements }} {{ t("common.noData") !== 'Không có dữ liệu' ? 'records' : 'bản ghi' }}</span>
        <div class="pagination-actions">
          <button
            class="btn btn-sm"
            type="button"
            :disabled="!hasPreviousPage || isLoading"
            @click="previousPage"
          >
            <i class="mdi mdi-chevron-left"></i>
            {{ t("common.noData") !== 'Không có dữ liệu' ? 'Prev' : 'Trước' }}
          </button>
          <span class="page-indicator">
            {{ t("common.noData") !== 'Không có dữ liệu' ? 'Page' : 'Trang' }} 
            {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}
          </span>
          <button
            class="btn btn-sm"
            type="button"
            :disabled="!hasNextPage || isLoading"
            @click="nextPage"
          >
            {{ t("common.noData") !== 'Không có dữ liệu' ? 'Next' : 'Sau' }}
            <i class="mdi mdi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else>
      <EmptyState
        :title="t('replenishment.empty.title')"
        :description="t('replenishment.empty.desc')"
        icon="mdi-check-circle-outline"
      />
    </div>
  </div>
</template>

<style scoped>
.table-container {
  margin-top: 16px;
}

.product-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stock-info-cell {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
}

.filter-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.mobile-list {
  display: none;
}

@media (max-width: 768px) {
  .desktop-table {
    display: none;
  }
  .mobile-list {
    display: block;
  }
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.pagination-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-indicator {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}
</style>
