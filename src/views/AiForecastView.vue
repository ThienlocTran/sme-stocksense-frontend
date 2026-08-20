<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import ApexCharts from "vue3-apexcharts";
import PageHeader from "../components/PageHeader.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { getProducts } from "../services/productService";
import { getWarehouses } from "../services/warehouseService";
import {
  checkDrift,
  getForecast,
  runForecast,
  seedForecastHistory,
} from "../services/forecastService";
import { useAuthStore } from "../stores/auth";
import { canRunForecast, canSeedForecastHistory } from "../services/permissionService";
import { getForecastModeLabel, getDriftStatusLabel } from "../constants/forecastOptions";

defineOptions({
  components: { ApexCharts },
});

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();

const products = ref([]);
const warehouses = ref([]);
const selectedProductId = ref("");
const selectedWarehouseId = ref("");

const isLoadingDropdowns = ref(false);
const isRunningForecast = ref(false);
const isLoadingForecast = ref(false);
const isCheckingDrift = ref(false);
const isSeeding = ref(false);

const forecast = ref(null);
const drift = ref(null);
const errorMessage = ref("");
const seedMessage = ref("");

const canRun = computed(() => canRunForecast(authStore.currentRole));
const canSeed = computed(() => canSeedForecastHistory(authStore.currentRole));
const canSelect = computed(
  () => selectedProductId.value !== "" && selectedWarehouseId.value !== "",
);

onMounted(loadDropdowns);

async function loadDropdowns() {
  isLoadingDropdowns.value = true;
  try {
    const [productPage, warehouseList] = await Promise.all([
      getProducts({ page: 0, size: 200 }),
      getWarehouses(),
    ]);
    products.value = productPage.content || [];
    warehouses.value = warehouseList || [];
  } catch (error) {
    errorMessage.value = error.message;
    if (error.status === 401) {
      router.replace("/login");
    }
  } finally {
    isLoadingDropdowns.value = false;
  }
}

watch([selectedProductId, selectedWarehouseId], async ([productId, warehouseId]) => {
  forecast.value = null;
  drift.value = null;
  errorMessage.value = "";
  if (!productId || !warehouseId) {
    return;
  }
  await loadCachedForecast();
});

async function loadCachedForecast() {
  isLoadingForecast.value = true;
  errorMessage.value = "";
  try {
    forecast.value = await getForecast(selectedProductId.value, selectedWarehouseId.value);
  } catch (error) {
    // Chưa có dự báo nào là trạng thái bình thường (chưa từng chạy) -> không hiện lỗi.
    if (error.status !== 404) {
      errorMessage.value = error.message;
    }
    forecast.value = null;
  } finally {
    isLoadingForecast.value = false;
  }
}

async function handleRunForecast() {
  if (!canSelect.value) return;
  isRunningForecast.value = true;
  errorMessage.value = "";
  try {
    forecast.value = await runForecast(selectedProductId.value, selectedWarehouseId.value);
  } catch (error) {
    errorMessage.value = error.message;
    if (error.status === 401) {
      router.replace("/login");
    }
  } finally {
    isRunningForecast.value = false;
  }
}

async function handleCheckDrift() {
  if (!canSelect.value) return;
  isCheckingDrift.value = true;
  errorMessage.value = "";
  try {
    drift.value = await checkDrift(selectedProductId.value, selectedWarehouseId.value);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isCheckingDrift.value = false;
  }
}

async function handleSeedHistory() {
  isSeeding.value = true;
  seedMessage.value = "";
  errorMessage.value = "";
  try {
    const result = await seedForecastHistory();
    seedMessage.value = t("forecast.msg.seedSuccess", { products: result.productsSeeded, rows: result.rowsInserted });
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isSeeding.value = false;
  }
}

function formatNumber(value) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", { hour12: false });
}

function driftBadgeVariant(status) {
  if (status === "DRIFT") return t("forecast.drift.rejected");
  if (status === "OK") return t("forecast.drift.approved");
  return t("forecast.drift.pending");
}

// Đường tồn kho dự kiến: 4 điểm neo đúng theo tốc độ tiêu thụ dự báo của từng mốc
// (ngày 0 = hôm nay, dùng forecast7d/14d/30d để suy ra tồn kho còn lại tại mỗi mốc)
const depletionSeries = computed(() => {
  if (!forecast.value) return [{ name: t("forecast.chart.seriesName"), data: [] }];
  const stock = forecast.value.currentStock ?? 0;
  const point = (day, forecastValue) => ({
    x: day,
    y: Math.max(0, stock - Number(forecastValue ?? 0) * day),
  });
  return [
    {
      name: "Tồn kho dự kiến",
      data: [
        { x: 0, y: stock },
        point(7, forecast.value.forecast7d),
        point(14, forecast.value.forecast14d),
        point(30, forecast.value.forecast30d),
      ],
    },
  ];
});

const depletionOptions = computed(() => ({
  chart: {
    type: "line",
    fontFamily: "inherit",
    toolbar: { show: false },
    zoom: { enabled: false },
    selection: { enabled: false },
  },
  stroke: { curve: "straight", width: 3 },
  markers: { size: 5 },
  xaxis: {
    type: "numeric",
    title: { text: t("forecast.chart.xAxis") },
    tickAmount: 4,
  },
  yaxis: {
    title: { text: t("forecast.chart.yAxis") },
    min: 0,
    decimalsInFloat: 0,
    labels: {
      formatter: (value) => new Intl.NumberFormat("vi-VN").format(Math.round(value)),
    },
  },
  colors: ["#2563eb"],
  annotations: {
    yaxis: [
      {
        y: forecast.value?.minStock ?? 0,
        borderColor: "#ef4444",
        strokeDashArray: 6,
        label: {
          text: `${t("forecast.chart.minThreshold")} (${formatNumber(forecast.value?.minStock)})`,
          style: { color: "#fff", background: "#ef4444" },
        },
      },
    ],
  },
  tooltip: {
    x: { formatter: (value) => `${t("forecast.chart.day")} +${value}` },
    y: { formatter: (value) => new Intl.NumberFormat("vi-VN").format(Math.round(value)) },
  },
}));

// Câu tóm tắt bằng lời cho người không rành số liệu vẫn hiểu ngay.
const summaryText = computed(() => {
  if (!forecast.value) return "";
  const rate = Number(forecast.value.forecast30d ?? 0);
  const stock = forecast.value.currentStock ?? 0;
  const minStock = forecast.value.minStock ?? 0;
  const rateText = formatNumber(rate);

  if (rate <= 0) {
    return t("forecast.summary.noData");
  }
  if (stock <= minStock) {
    return t("forecast.summary.urgent", { rate: rateText, stock: formatNumber(stock), min: formatNumber(minStock) });
  }
  const daysUntilMin = Math.max(0, Math.floor((stock - minStock) / rate));
  return t("forecast.summary.normal", { rate: rateText, stock: formatNumber(stock), days: daysUntilMin, min: formatNumber(minStock) });
});
</script>

<template>
  <PageHeader
    :title="t('forecast.title')"
    :description="t('forecast.description')"
  >
    <button
      v-if="canSeed"
      class="btn btn-ghost"
      type="button"
      :disabled="isSeeding"
      @click="handleSeedHistory"
    >
      <i class="mdi" :class="isSeeding ? 'mdi-loading mdi-spin' : 'mdi-database-plus-outline'"></i>
      Sinh dữ liệu demo
    </button>
  </PageHeader>

  <p v-if="seedMessage" class="form-alert form-alert-success">{{ seedMessage }}</p>
  <p v-if="errorMessage" class="form-alert form-alert-error">{{ errorMessage }}</p>

  <div class="card card-pad selector-bar">
    <div class="selector-field">
      <label class="field-label">{{ t("forecast.filter.product") }}</label>
      <select v-model="selectedProductId" class="select" :disabled="isLoadingDropdowns">
        <option value="">{{ isLoadingDropdowns ? t("forecast.filter.loadingProduct") : t("forecast.filter.selectProduct") }}</option>
        <option v-for="product in products" :key="product.id" :value="product.id">
          {{ product.code || product.maSanPham }} - {{ product.name || product.tenSanPham }}
        </option>
      </select>
    </div>
    <div class="selector-field">
      <label class="field-label">{{ t("forecast.filter.warehouse") }}</label>
      <select v-model="selectedWarehouseId" class="select" :disabled="isLoadingDropdowns">
        <option value="">{{ isLoadingDropdowns ? t("forecast.filter.loadingWarehouse") : t("forecast.filter.selectWarehouse") }}</option>
        <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
          {{ warehouse.code || warehouse.maKho }} - {{ warehouse.name || warehouse.tenKho }}
        </option>
      </select>
    </div>
    <div class="selector-actions">
      <button
        v-if="canRun"
        class="btn btn-primary"
        type="button"
        :disabled="!canSelect || isRunningForecast"
        @click="handleRunForecast"
      >
        <i class="mdi" :class="isRunningForecast ? 'mdi-loading mdi-spin' : 'mdi-chart-timeline-variant'"></i>
        {{ isRunningForecast ? t("forecast.button.running") : t("forecast.button.run") }}
      </button>
      <button
        v-if="canRun"
        class="btn btn-secondary"
        type="button"
        :disabled="!canSelect || isCheckingDrift"
        @click="handleCheckDrift"
      >
        <i class="mdi" :class="isCheckingDrift ? 'mdi-loading mdi-spin' : 'mdi-radar'"></i>
        Kiểm tra lệch mô hình
      </button>
    </div>
  </div>

  <div v-if="isLoadingForecast" class="inventory-loading card card-pad">
    <i class="mdi mdi-loading mdi-spin"></i>
    <span>{{ t("forecast.loading") }}</span>
  </div>

  <EmptyState
    v-else-if="!forecast && canSelect"
    :title="t('forecast.empty.noResultTitle')"
    :description="t('forecast.empty.noResultDesc')"
    icon="mdi-chart-line"
  />

  <EmptyState
    v-else-if="!forecast"
    :title="t('forecast.empty.selectTitle')"
    :description="t('forecast.empty.selectDesc')"
    icon="mdi-cursor-default-click-outline"
  />

  <template v-else>
    <p class="card card-pad summary-banner">
      <i class="mdi mdi-lightbulb-on-outline"></i>
      <span>{{ summaryText }}</span>
    </p>

    <div class="stat-grid">
      <div class="card card-pad stat-card">
        <span class="stat-label">{{ t("forecast.stats.mode") }}</span>
        <strong class="stat-value">{{ getForecastModeLabel(forecast.mode) }}</strong>
        <span class="text-xs text-[var(--color-text-secondary)] mt-1" v-if="forecast.mode === 'COLD_START_AVG'">
          {{ t("forecast.stats.coldStartNote") }}
        </span>
        <span class="text-xs text-[var(--color-text-secondary)] mt-1" v-else>
          {{ t("forecast.stats.dataDaysNote", { days: formatNumber(forecast.dataDays) }) }}
        </span>
      </div>
      <div class="card card-pad stat-card">
        <span class="stat-label">{{ t("forecast.stats.smape") }}</span>
        <strong class="stat-value">{{ formatNumber(forecast.smape) }}%</strong>
        <span class="text-xs text-[var(--color-text-secondary)] mt-1">{{ t("forecast.stats.smapeNote") }}</span>
      </div>
      <div class="card card-pad stat-card">
        <span class="stat-label">{{ t("forecast.stats.currentStock") }}</span>
        <strong class="stat-value">{{ formatNumber(forecast.currentStock) }}</strong>
        <span class="text-xs text-[var(--color-text-secondary)] mt-1">{{ t("forecast.stats.minStockNote", { min: formatNumber(forecast.minStock) }) }}</span>
      </div>
    </div>

    <div class="card card-pad chart-card">
      <h3 class="section-title">{{ t("forecast.reorder.title") }}</h3>
      <div class="reorder-grid">
        <div class="reorder-item">
          <span class="reorder-label">{{ t("forecast.reorder.7d") }}</span>
          <strong class="reorder-value" :class="{ 'reorder-value--warning': forecast.reorderQty7d > 0 }">
            {{ formatNumber(forecast.reorderQty7d) }}
          </strong>
        </div>
        <div class="reorder-item">
          <span class="reorder-label">{{ t("forecast.reorder.14d") }}</span>
          <strong class="reorder-value" :class="{ 'reorder-value--warning': forecast.reorderQty14d > 0 }">
            {{ formatNumber(forecast.reorderQty14d) }}
          </strong>
        </div>
        <div class="reorder-item">
          <span class="reorder-label">{{ t("forecast.reorder.30d") }}</span>
          <strong class="reorder-value" :class="{ 'reorder-value--warning': forecast.reorderQty30d > 0 }">
            {{ formatNumber(forecast.reorderQty30d) }}
          </strong>
        </div>
      </div>
      <span class="text-xs text-[var(--color-text-secondary)] mt-1">
        {{ t("forecast.reorder.note") }}
      </span>
    </div>

    <div class="card card-pad chart-card">
      <h3 class="section-title">{{ t("forecast.chart.title") }}</h3>
      <ApexCharts type="line" :options="depletionOptions" :series="depletionSeries" height="300" />
      <span class="text-xs text-[var(--color-text-secondary)]">{{ t("forecast.chart.versionNote", { version: forecast.version, time: formatDateTime(forecast.trainedAt) }) }}</span>
    </div>

    <div v-if="drift" class="card card-pad drift-card">
      <h3 class="section-title">{{ t("forecast.drift.title") }}</h3>
      <div class="drift-row">
        <StatusBadge :status="driftBadgeVariant(drift.status)" />
        <span class="font-semibold">{{ getDriftStatusLabel(drift.status) }}</span>
      </div>
      <div v-if="drift.rollingSmape !== null && drift.rollingSmape !== undefined" class="drift-row text-xs text-[var(--color-text-secondary)]">
        <span>{{ t("forecast.drift.note", { smape: formatNumber(drift.rollingSmape), threshold: formatNumber(drift.threshold), days: drift.overlapDays }) }}</span>
      </div>
    </div>
  </template>
</template>

<style scoped>
.form-alert {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: 8px;
  line-height: 20px;
  font-weight: 500;
}
.form-alert-error {
  background: var(--color-danger-soft);
  color: var(--color-danger);
  border: 1px solid rgba(220, 38, 38, 0.2);
}
.form-alert-success {
  background: var(--color-success-soft);
  color: var(--color-success);
  border: 1px solid rgba(22, 130, 93, 0.2);
}
.selector-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.selector-field {
  display: grid;
  gap: 6px;
  min-width: 220px;
  flex: 1;
}
.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
.selector-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.inventory-loading {
  min-height: 180px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: var(--color-text-secondary);
  font-weight: 700;
}
.mdi-spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.summary-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 0 0 20px;
  background: var(--color-action-primary-soft);
  border: 1px solid var(--color-action-primary-border);
  color: var(--color-text-primary);
  font-weight: 600;
  line-height: 1.5;
  border-radius: 8px;
}
.summary-banner i {
  font-size: 20px;
  color: var(--color-action-primary);
  flex-shrink: 0;
  margin-top: 2px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 600;
}
.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.chart-card,
.drift-card {
  margin-bottom: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.reorder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}
.reorder-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border-radius: 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}
.reorder-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}
.reorder-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}
.reorder-value--warning {
  color: var(--color-warning);
}

.drift-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 767px) {
  .selector-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .selector-field {
    width: 100%;
  }
  .selector-actions {
    flex-direction: column;
  }
  .selector-actions .btn {
    width: 100%;
  }
}
</style>
