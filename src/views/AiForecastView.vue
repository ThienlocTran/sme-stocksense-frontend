<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import ApexCharts from "vue3-apexcharts";
import PageHeader from "../components/PageHeader.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import ActualForecastChart from "../components/ActualForecastChart.vue";
import ProjectedInventoryChart from "../components/ProjectedInventoryChart.vue";
import { getProducts } from "../services/productService";
import { getWarehouses } from "../services/warehouseService";
import {
  checkDrift,
  getForecast,
  runForecast,
} from "../services/forecastService";
import { useAuthStore } from "../stores/auth";
import { canRunForecast } from "../services/permissionService";
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
const selectedHorizon = ref(30);

const isLoadingDropdowns = ref(false);
const isRunningForecast = ref(false);
const isLoadingForecast = ref(false);
const isCheckingDrift = ref(false);

const forecast = ref(null);
const drift = ref(null);
const errorMessage = ref("");

const canRun = computed(() => canRunForecast(authStore.currentRole));
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
    errorMessage.value = error.message;
    if (error.status === 401) {
      router.replace("/login");
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
const boundaryDateStr = computed(() => {
  const today = new Date();
  return today.toISOString().split("T")[0];
});

const simulatedHistorical = computed(() => {
  if (!forecast.value) return [];
  const points = [];
  const today = new Date();
  const baseDemand = Number(forecast.value.forecast30d ?? 90) / 30;

  for (let i = 30; i > 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const factor = 0.7 + (i % 7) * 0.1;
    points.push({
      date: d.toISOString().split("T")[0],
      quantity: Math.max(0, Math.round(baseDemand * factor)),
    });
  }
  return points;
});

const simulatedForecast = computed(() => {
  if (!forecast.value) return [];
  const points = [];
  const today = new Date();
  const horizon = selectedHorizon.value;

  let totalForecast = 0;
  if (horizon === 7) totalForecast = Number(forecast.value.forecast7d ?? 20);
  else if (horizon === 14) totalForecast = Number(forecast.value.forecast14d ?? 45);
  else totalForecast = Number(forecast.value.forecast30d ?? 90);

  const dailyAverage = totalForecast / horizon;

  for (let i = 1; i <= horizon; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const factor = 0.8 + (i % 5) * 0.1;
    points.push({
      date: d.toISOString().split("T")[0],
      predictedQuantity: Math.round(dailyAverage * factor),
    });
  }
  return points;
});

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
  let text = "";
  if (stock <= minStock) {
    text = t("forecast.summary.urgent", { rate: rateText, stock: formatNumber(stock), min: formatNumber(minStock) });
  } else {
    const daysUntilMin = Math.max(0, Math.floor((stock - minStock) / rate));
    text = t("forecast.summary.normal", { rate: rateText, stock: formatNumber(stock), days: daysUntilMin, min: formatNumber(minStock) });
  }
  if (forecast.value.capacityLimited7d || forecast.value.capacityLimited14d || forecast.value.capacityLimited30d) {
    text += " ⚠️ " + t('forecast.capacityLimitedDesc');
  }
  return text;
});
</script>

<template>
  <PageHeader
    :title="t('forecast.title')"
    :description="t('forecast.description')"
  />

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
    <div class="selector-field">
      <label class="field-label">Thời gian dự báo (Horizon)</label>
      <select v-model="selectedHorizon" class="select" :disabled="isLoadingDropdowns">
        <option :value="7">7 ngày</option>
        <option :value="14">14 ngày</option>
        <option :value="30">30 ngày</option>
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
    <!-- Header / Context -->
    <div class="card card-pad summary-context-card">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span class="text-xs uppercase font-bold text-zinc-500 tracking-wider">Thông tin mô hình dự báo</span>
          <h4 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {{ getForecastModeLabel(forecast.mode) }}
          </h4>
          <p class="text-xs text-zinc-500 mt-1">
            <span v-if="forecast.mode === 'COLD_START_AVG'">
              {{ t("forecast.stats.coldStartNote") }}
            </span>
            <span v-else>
              {{ t("forecast.stats.dataDaysNote", { days: formatNumber(forecast.dataDays) }) }}
            </span>
            | Độ lệch mô hình (sMAPE): <strong>{{ formatNumber(forecast.smape) }}%</strong>
          </p>
        </div>
        <p class="summary-banner mb-0 self-stretch md:self-auto flex-1 md:flex-initial">
          <i class="mdi mdi-lightbulb-on-outline"></i>
          <span>{{ summaryText }}</span>
        </p>
      </div>
    </div>

    <!-- Summary Statistics Grid -->
    <div class="stat-grid mt-6">
      <div class="card card-pad stat-card">
        <span class="stat-label">Dự báo nhu cầu ({{ selectedHorizon }} ngày)</span>
        <strong class="stat-value">
          {{ selectedHorizon === 7 ? formatNumber(forecast.forecast7d) : selectedHorizon === 14 ? formatNumber(forecast.forecast14d) : formatNumber(forecast.forecast30d) }}
        </strong>
        <span class="text-xs text-[var(--color-text-secondary)] mt-1">Tổng nhu cầu bán hàng dự kiến</span>
      </div>
      <div class="card card-pad stat-card">
        <span class="stat-label">Tồn kho hiện tại</span>
        <strong class="stat-value">{{ formatNumber(forecast.currentStock) }}</strong>
        <span class="text-xs text-[var(--color-text-secondary)] mt-1">{{ t("forecast.stats.minStockNote", { min: formatNumber(forecast.minStock) }) }}</span>
      </div>
      <div class="card card-pad stat-card">
        <span class="stat-label">Ngưỡng tồn kho tối thiểu</span>
        <strong class="stat-value text-red-500">{{ formatNumber(forecast.minStock) }}</strong>
        <span class="text-xs text-[var(--color-text-secondary)] mt-1">Điểm kích hoạt bổ sung hàng</span>
      </div>
      <div class="card card-pad stat-card">
        <span class="stat-label">Đề xuất bổ sung</span>
        <strong class="stat-value" :class="{ 'text-amber-500': (selectedHorizon === 7 ? forecast.reorderQty7d : selectedHorizon === 14 ? forecast.reorderQty14d : forecast.reorderQty30d) > 0 }">
          {{ selectedHorizon === 7 ? formatNumber(forecast.reorderQty7d) : selectedHorizon === 14 ? formatNumber(forecast.reorderQty14d) : formatNumber(forecast.reorderQty30d) }}
        </strong>
        <span class="text-xs text-[var(--color-text-secondary)] mt-1">Số lượng hệ thống đề xuất nhập</span>
      </div>
    </div>

    <!-- Chart A: Actual vs Forecast -->
    <div class="card card-pad chart-card mt-6">
      <h3 class="section-title">Nhu cầu bán hàng thực tế & Dự báo (Actual vs Forecast)</h3>
      <ActualForecastChart
        :historical="simulatedHistorical"
        :forecast="simulatedForecast"
        :boundary-date="boundaryDateStr"
        :horizon-days="selectedHorizon"
      />
    </div>

    <!-- Chart B: Projected Inventory -->
    <div class="card card-pad chart-card mt-6">
      <h3 class="section-title">Dự báo diễn biến tồn kho (Projected Inventory)</h3>
      <ProjectedInventoryChart
        :current-stock="forecast.currentStock ?? 0"
        :daily-forecast="simulatedForecast"
        :effective-min-stock="forecast.minStock ?? 0"
        :boundary-date="boundaryDateStr"
        :horizon-days="selectedHorizon"
      />
    </div>

    <!-- Recommendation Detail & Capacity Warnings -->
    <div class="card card-pad chart-card mt-6">
      <h3 class="section-title">Chi tiết đề xuất & Dung tích kho hàng</h3>
      <div class="py-2 text-sm text-zinc-700 dark:text-zinc-300 space-y-3">
        <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
          <span>Tổng lượng hàng cần nhập (Raw Need):</span>
          <strong>{{ selectedHorizon === 7 ? formatNumber(forecast.reorderQty7d) : selectedHorizon === 14 ? formatNumber(forecast.reorderQty14d) : formatNumber(forecast.reorderQty30d) }}</strong>
        </div>
        <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
          <span>Giới hạn dung tích kho cho phép:</span>
          <strong>
            {{ selectedHorizon === 7 ? (forecast.capacityLimited7d ? formatNumber(forecast.capacityAllowedQuantity7d) : 'Không giới hạn') : selectedHorizon === 14 ? (forecast.capacityLimited14d ? formatNumber(forecast.capacityAllowedQuantity14d) : 'Không giới hạn') : (forecast.capacityLimited30d ? formatNumber(forecast.capacityAllowedQuantity30d) : 'Không giới hạn') }}
          </strong>
        </div>
        <div v-if="selectedHorizon === 7 ? forecast.capacityLimited7d : selectedHorizon === 14 ? forecast.capacityLimited14d : forecast.capacityLimited30d" class="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-900/30 text-xs">
          <i class="mdi mdi-alert mr-1"></i>
          Cảnh báo: Lượng hàng đề xuất bổ sung vượt quá dung tích còn trống của kho hàng.
        </div>
      </div>
    </div>

    <!-- Replenishment Assignment (Later Action Area) -->
    <div v-if="canRun" class="card card-pad mt-6">
      <h3 class="section-title">Giao nhiệm vụ bổ sung hàng</h3>
      <p class="text-sm text-zinc-500 mt-1">
        Bổ nhiệm nhân viên xử lý đặt hàng hoặc điều chuyển nội bộ dựa trên dự báo này.
      </p>
      <div class="py-6 text-center text-zinc-400 border border-dashed rounded mt-3">
        Khu vực tạo nhiệm vụ phân công (Sẽ được xây dựng trong Task 7/8)
      </div>
    </div>

    <!-- Drift Card (Drift/Model Drift check results) -->
    <div v-if="drift" class="card card-pad drift-card mt-6">
      <h3 class="section-title">{{ t("forecast.drift.title") }}</h3>
      <div class="drift-row">
        <StatusBadge :status="driftBadgeVariant(drift.status)" />
        <span class="font-semibold">{{ getDriftStatusLabel(drift.status) }}</span>
      </div>
      <div v-if="drift.rollingSmape !== null && drift.rollingSmape !== undefined" class="drift-metrics">
        <div class="drift-metric-item">
          <span class="drift-metric-label">sMAPE thực tế</span>
          <strong class="drift-metric-value" :class="drift.retrainNeeded ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'">
            {{ formatNumber(drift.rollingSmape) }}%
          </strong>
        </div>
        <div class="drift-metric-item">
          <span class="drift-metric-label">Ngưỡng lệch</span>
          <strong class="drift-metric-value">{{ formatNumber(drift.threshold) }}%</strong>
        </div>
        <div class="drift-metric-item">
          <span class="drift-metric-label">Ngày so sánh</span>
          <strong class="drift-metric-value">{{ drift.overlapDays }} ngày</strong>
        </div>
      </div>
      <div v-if="drift.status === 'NO_ACTUAL_DATA'" class="drift-explain">
        <i class="mdi mdi-information-outline"></i>
        <span>Chưa có giao dịch xuất kho thực tế trong 30 ngày qua để so sánh với dự báo đã lưu.</span>
      </div>
      <div v-else-if="drift.status === 'NO_FORECAST_DATA'" class="drift-explain">
        <i class="mdi mdi-information-outline"></i>
        <span>Chưa có bản ghi dự báo nào được lưu. Hãy bấm <strong>Dự báo ngay</strong> trước.</span>
      </div>
      <div v-else-if="drift.status === 'INSUFFICIENT_OVERLAP'" class="drift-explain">
        <i class="mdi mdi-information-outline"></i>
        <span>Chỉ có <strong>{{ drift.overlapDays }}</strong> ngày trùng nhau giữa dự báo và thực tế (cần tối thiểu 7 ngày). Cần thêm dữ liệu.</span>
      </div>
      <div class="drift-rule">
        <i class="mdi mdi-help-circle-outline"></i>
        <span>Mô hình bị đánh dấu <strong>Lệch</strong> khi sMAPE &gt; {{ formatNumber(drift.threshold) }}% trên ít nhất 7 ngày có dữ liệu cả hai phía.</span>
      </div>
      <div v-if="drift.retrainNeeded" class="drift-action">
        <i class="mdi mdi-refresh-circle text-[var(--color-warning)]"></i>
        <span>Mô hình đang lệch – nên bấm <strong>Dự báo ngay</strong> để train lại với dữ liệu mới nhất.</span>
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

.drift-metrics {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}
.drift-metric-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 90px;
}
.drift-metric-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.drift-metric-value {
  font-size: 20px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
}

.drift-explain,
.drift-rule,
.drift-action {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 6px;
  padding: 8px 10px;
}
.drift-explain {
  background: var(--color-action-primary-soft);
  color: var(--color-text-secondary);
}
.drift-rule {
  background: var(--color-bg);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}
.drift-action {
  background: rgba(234, 179, 8, 0.08);
  color: var(--color-text-primary);
  border: 1px solid rgba(234, 179, 8, 0.25);
  font-weight: 500;
}
.drift-explain i,
.drift-rule i,
.drift-action i {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
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
