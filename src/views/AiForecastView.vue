<script setup>
import { computed, onMounted, ref, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import ApexCharts from "vue3-apexcharts";
import PageHeader from "../components/PageHeader.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import ActualForecastChart from "../components/ActualForecastChart.vue";
import ProjectedInventoryChart from "../components/ProjectedInventoryChart.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { getEmployees } from "../services/employeeService";
import { getReplenishmentRecommendation } from "../services/replenishmentService";
import { createAiPurchaseAssignment, retryEmail } from "../services/aiPurchaseAssignmentService";
import {
  checkDrift,
  getForecast,
  runForecast,
  getForecastAvailability,
  seedDemoHistory,
} from "../services/forecastService";
import { useAuthStore } from "../stores/auth";
import { useForecastStore } from "../stores/forecast";
import { canRunForecast } from "../services/permissionService";
import { getForecastModeLabel, getDriftStatusLabel } from "../constants/forecastOptions";

defineOptions({
  components: { ApexCharts },
});

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const forecastStore = useForecastStore();

const selectedSource = ref(forecastStore.jobStatus !== 'IDLE' ? "SEED_DEMO" : "EXTERNAL_STORE_ITEM");
const availableCombinations = ref([]);
const isSeedingHistory = ref(false);
const showSeedConfirmation = ref(false);

async function handleSeedHistory() {
  showSeedConfirmation.value = false;
  try {
    await forecastStore.triggerSeed();
  } catch (error) {
    // Handled in watcher
  }
}

watch(() => forecastStore.jobStatus, async (newStatus) => {
  if (newStatus === 'COMPLETED') {
    isSeedingHistory.value = false;
    successMessage.value = t('forecast.seedSuccessMsg', {
      seeded: forecastStore.seededCount,
      rows: forecastStore.rowsCount
    });
    isLoadingDropdowns.value = true;
    try {
      const availRes = await getForecastAvailability("SEED_DEMO");
      availableCombinations.value = availRes.combinations || [];
    } catch (err) {
      errorMessage.value = err.message;
    } finally {
      isLoadingDropdowns.value = false;
    }
    setTimeout(() => {
      if (forecastStore.jobStatus === 'COMPLETED') {
        forecastStore.clearState();
      }
    }, 5000);
  } else if (newStatus === 'FAILED') {
    isSeedingHistory.value = false;
    errorMessage.value = forecastStore.jobErrorMessage;
    setTimeout(() => {
      if (forecastStore.jobStatus === 'FAILED') {
        forecastStore.clearState();
      }
    }, 5000);
  } else if (newStatus === 'RUNNING') {
    isSeedingHistory.value = true;
    errorMessage.value = "";
    successMessage.value = "";
  }
});

function sortByCode(a, b) {
  const codeA = (a.code || '').trim();
  const codeB = (b.code || '').trim();
  return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
}

const products = computed(() => {
  const seenIds = new Set();
  const list = [];
  for (const c of availableCombinations.value) {
    if (!seenIds.has(c.productId)) {
      seenIds.add(c.productId);
      list.push({
        id: c.productId,
        code: c.productCode,
        name: c.productName
      });
    }
  }
  if (selectedWarehouseId.value) {
    return list.filter(p => 
      availableCombinations.value.some(c => c.productId === p.id && c.warehouseId === selectedWarehouseId.value)
    ).sort(sortByCode);
  }
  return list.sort(sortByCode);
});

const warehouses = computed(() => {
  const seenIds = new Set();
  const list = [];
  for (const c of availableCombinations.value) {
    if (!seenIds.has(c.warehouseId)) {
      seenIds.add(c.warehouseId);
      list.push({
        id: c.warehouseId,
        code: c.warehouseCode,
        name: c.warehouseName
      });
    }
  }
  if (selectedProductId.value) {
    return list.filter(w => 
      availableCombinations.value.some(c => c.productId === selectedProductId.value && c.warehouseId === w.id)
    ).sort(sortByCode);
  }
  return list.sort(sortByCode);
});

const selectedProductId = ref("");
const selectedWarehouseId = ref("");
const selectedHorizon = ref(30);
const successMessage = ref("");

const employees = ref([]);
const showAssignmentModal = ref(false);
const selectedEmployeeId = ref("");
const humanRequestedQuantity = ref(0);
const assignmentContent = ref("");
const assignmentSuccessMessage = ref("");
const assignmentErrorMessage = ref("");
const isSubmittingAssignment = ref(false);
const assignmentResult = ref(null);
const isRetryingEmail = ref(false);

const isLoadingDropdowns = ref(false);
const isRunningForecast = ref(false);
const isLoadingForecast = ref(false);
const isCheckingDrift = ref(false);
const recommendation = ref(null);
const isLoadingRecommendation = ref(false);

const forecast = ref(null);
const drift = ref(null);
const driftCardRef = ref(null);
const errorMessage = ref("");

const chartStartDate = ref("");
const chartEndDate = ref("");

function subtractDaysFromDateStr(dateStr, days) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  date.setDate(date.getDate() - days);
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const filteredHistorical = computed(() => {
  if (!forecast.value || !forecast.value.historical) return [];
  if (!chartStartDate.value || !chartEndDate.value) {
    return forecast.value.historical;
  }
  // Use timezone-independent comparisons by matching parts
  const startStr = chartStartDate.value;
  const endStr = chartEndDate.value;
  return forecast.value.historical.filter((p) => {
    return p.date >= startStr && p.date <= endStr;
  });
});

const canRun = computed(() => canRunForecast(authStore.currentRole));
const canSelect = computed(
  () => selectedProductId.value !== "" && selectedWarehouseId.value !== "",
);

onMounted(async () => {
  isLoadingDropdowns.value = true;
  try {
    const promises = [
      getForecastAvailability(selectedSource.value),
    ];
    if (canRun.value) {
      promises.push(getEmployees({ page: 0, size: 100, status: "HOAT_DONG", roleCode: "EMPLOYEE" }));
    }
    const [availabilityRes, employeePage] = await Promise.all(promises);
    availableCombinations.value = availabilityRes.combinations || [];
    if (canRun.value && employeePage) {
      employees.value = employeePage.content || [];
    }

    if (forecastStore.jobStatus === 'COMPLETED') {
      successMessage.value = t('forecast.seedSuccessMsg', {
        seeded: forecastStore.seededCount,
        rows: forecastStore.rowsCount
      });
      forecastStore.clearState();
    } else if (forecastStore.jobStatus === 'FAILED') {
      errorMessage.value = forecastStore.jobErrorMessage;
      forecastStore.clearState();
    } else if (forecastStore.jobStatus === 'RUNNING') {
      isSeedingHistory.value = true;
    }
  } catch (error) {
    errorMessage.value = error.message;
    if (error.status === 401) {
      router.replace("/login");
    }
  } finally {
    isLoadingDropdowns.value = false;
  }
});

watch(selectedSource, async (newSource) => {
  forecast.value = null;
  drift.value = null;
  recommendation.value = null;
  errorMessage.value = "";
  successMessage.value = "";
  chartStartDate.value = "";
  chartEndDate.value = "";

  isLoadingDropdowns.value = true;
  try {
    const res = await getForecastAvailability(newSource);
    availableCombinations.value = res.combinations || [];

    if (selectedProductId.value && selectedWarehouseId.value) {
      const isValid = availableCombinations.value.some(c => 
        c.productId === selectedProductId.value && c.warehouseId === selectedWarehouseId.value
      );
      if (!isValid) {
        selectedProductId.value = "";
        selectedWarehouseId.value = "";
      } else {
        await loadCachedForecast();
      }
    } else {
      selectedProductId.value = "";
      selectedWarehouseId.value = "";
    }
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoadingDropdowns.value = false;
  }
});

watch([selectedProductId, selectedWarehouseId], async ([productId, warehouseId]) => {
  if (productId && warehouseId) {
    const isValid = availableCombinations.value.some(c => 
      c.productId === productId && c.warehouseId === warehouseId
    );
    if (!isValid) {
      selectedProductId.value = "";
      selectedWarehouseId.value = "";
      forecast.value = null;
      drift.value = null;
      recommendation.value = null;
      errorMessage.value = "";
      return;
    }
  }

  forecast.value = null;
  drift.value = null;
  recommendation.value = null;
  errorMessage.value = "";
  successMessage.value = "";
  if (!productId || !warehouseId) {
    return;
  }
  await loadCachedForecast();
});

watch(selectedHorizon, async () => {
  recommendation.value = null;
  if (hasSufficientForecast(selectedHorizon.value)) {
    await loadRecommendation();
  } else {
    recommendation.value = null;
  }
});

watch([forecast, selectedHorizon], () => {
  if (forecast.value && forecast.value.historyEndDate) {
    chartEndDate.value = forecast.value.historyEndDate;
    chartStartDate.value = subtractDaysFromDateStr(forecast.value.historyEndDate, selectedHorizon.value - 1);
  } else {
    chartStartDate.value = "";
    chartEndDate.value = "";
  }
});

/**
 * Returns true only when forecast.value contains at least `horizon` daily
 * forecast points — meaning the backend has a trained model with enough data
 * to answer the recommendation API for the requested horizon.
 *
 * An empty-sentinel forecast ({ dataDays: 0, dailyForecast: [] }) evaluates
 * to false, which prevents the spurious 400 from /recommendation.
 */
function hasSufficientForecast(horizon) {
  return (
    !!forecast.value &&
    Array.isArray(forecast.value.dailyForecast) &&
    forecast.value.dailyForecast.length >= horizon
  );
}

const isRecommendationValid = computed(() => {
  return (
    !!recommendation.value &&
    !!forecast.value &&
    recommendation.value.modelMetadataId != null &&
    Number(recommendation.value.productId) === Number(forecast.value.productId) &&
    Number(recommendation.value.warehouseId) === Number(forecast.value.warehouseId)
  );
});

const totalHorizonDemand = computed(() => {
  if (!forecast.value || !Array.isArray(forecast.value.dailyForecast)) return 0;
  const horizon = selectedHorizon.value;
  const dailyPoints = forecast.value.dailyForecast.slice(0, horizon);
  return dailyPoints.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
});

async function loadRecommendation() {
  recommendation.value = null;
  if (!selectedProductId.value || !selectedWarehouseId.value || !selectedHorizon.value) {
    return;
  }
  // Guard: only call the API when the cached forecast has enough daily points.
  // Avoids a guaranteed 400 when forecast history is absent or too short.
  if (!hasSufficientForecast(selectedHorizon.value)) {
    recommendation.value = null;
    return;
  }
  isLoadingRecommendation.value = true;
  try {
    recommendation.value = await getReplenishmentRecommendation(
      selectedProductId.value,
      selectedWarehouseId.value,
      selectedHorizon.value
    );
  } catch (error) {
    // Only log truly unexpected errors; expected "no data" cases are
    // filtered out by hasSufficientForecast above.
    console.error("Failed to load recommendation:", error);
    recommendation.value = null;
  } finally {
    isLoadingRecommendation.value = false;
  }
}

async function loadCachedForecast() {
  isLoadingForecast.value = true;
  errorMessage.value = "";
  try {
    forecast.value = await getForecast(selectedProductId.value, selectedWarehouseId.value, selectedSource.value);
    if (forecast.value) {
      await loadRecommendation();
    } else {
      recommendation.value = null;
    }
  } catch (error) {
    if (error.message && (error.message.includes("lịch sử") || error.message.includes("history") || error.message.includes("dữ liệu") || error.message.includes("data"))) {
      forecast.value = { dataDays: 0, historical: [], dailyForecast: [] };
      recommendation.value = null;
    } else {
      errorMessage.value = error.message;
      if (error.status === 401) {
        router.replace("/login");
      }
      forecast.value = null;
      recommendation.value = null;
    }
  } finally {
    isLoadingForecast.value = false;
  }
}

async function handleRunForecast() {
  if (!canSelect.value) return;
  isRunningForecast.value = true;
  errorMessage.value = "";
  forecast.value = null;
  drift.value = null;
  recommendation.value = null;
  try {
    forecast.value = await runForecast(selectedProductId.value, selectedWarehouseId.value, selectedSource.value);
    if (forecast.value) {
      await loadRecommendation();
    } else {
      recommendation.value = null;
    }
  } catch (error) {
    if (error.message && (error.message.includes("lịch sử") || error.message.includes("history") || error.message.includes("dữ liệu") || error.message.includes("data"))) {
      forecast.value = { dataDays: 0, historical: [], dailyForecast: [] };
      recommendation.value = null;
    } else {
      errorMessage.value = error.message;
      if (error.status === 401) {
        router.replace("/login");
      }
      recommendation.value = null;
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
    await nextTick();
    if (driftCardRef.value) {
      driftCardRef.value.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  } catch (error) {
    if (error.message && (error.message.includes("lịch sử") || error.message.includes("history") || error.message.includes("dữ liệu") || error.message.includes("data"))) {
      drift.value = null;
    } else {
      errorMessage.value = error.message;
    }
  } finally {
    isCheckingDrift.value = false;
  }
}


function formatNumber(value) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatQty(value) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value));
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

// Boundary date for the timeline chart, mapping dynamically to historyEndDate to adapt to any source.
const boundaryDateStr = computed(() => {
  if (forecast.value && forecast.value.historyEndDate) {
    return forecast.value.historyEndDate;
  }
  const today = new Date();
  return today.toISOString().split("T")[0];
});

function openAssignmentModal() {
  selectedEmployeeId.value = "";
  humanRequestedQuantity.value = isRecommendationValid.value ? recommendation.value.suggestedQty : 0;
  assignmentContent.value = t("forecast.assignment.defaultMessage", { horizon: selectedHorizon.value });
  assignmentErrorMessage.value = "";
  assignmentSuccessMessage.value = "";
  assignmentResult.value = null;
  showAssignmentModal.value = true;
}

async function submitAssignment() {
  assignmentErrorMessage.value = "";
  assignmentSuccessMessage.value = "";

  if (!selectedEmployeeId.value) {
    assignmentErrorMessage.value = t("forecast.assignment.validationSelectEmployee");
    return;
  }
  if (!humanRequestedQuantity.value || humanRequestedQuantity.value <= 0) {
    assignmentErrorMessage.value = t("forecast.assignment.validationQtyPositive");
    return;
  }

  isSubmittingAssignment.value = true;
  try {
    const payload = {
      productId: Number(selectedProductId.value),
      warehouseId: Number(selectedWarehouseId.value),
      horizonDays: Number(selectedHorizon.value),
      modelMetadataId: isRecommendationValid.value ? recommendation.value.modelMetadataId : null,
      aiSuggestedQuantity: isRecommendationValid.value ? recommendation.value.suggestedQty : null,
      requestedQuantity: Number(humanRequestedQuantity.value),
      receiverId: Number(selectedEmployeeId.value),
      content: assignmentContent.value || null
    };
    const response = await createAiPurchaseAssignment(payload);
    assignmentResult.value = response;
    assignmentSuccessMessage.value = t("forecast.assignment.createSuccess");
  } catch (error) {
    assignmentErrorMessage.value = error.message || t("forecast.assignment.error");
  } finally {
    isSubmittingAssignment.value = false;
  }
}

async function handleRetryEmail() {
  if (!assignmentResult.value || !assignmentResult.value.id) return;

  isRetryingEmail.value = true;
  assignmentErrorMessage.value = "";
  assignmentSuccessMessage.value = "";

  try {
    const updatedAssignment = await retryEmail(assignmentResult.value.id);
    if (updatedAssignment && updatedAssignment.emailStatus) {
      assignmentResult.value.emailStatus = updatedAssignment.emailStatus;
    } else {
      assignmentResult.value.emailStatus = "DA_GUI";
    }
    assignmentSuccessMessage.value = t("forecast.assignment.retrySuccess");
  } catch (error) {
    assignmentErrorMessage.value = error.message || t("forecast.assignment.retryFailed");
  } finally {
    isRetryingEmail.value = false;
  }
}

// Câu tóm tắt bằng lời cho người không rành số liệu vẫn hiểu ngay.
const summaryText = computed(() => {
  if (!forecast.value) return "";

  if (isRecommendationValid.value) {
    const rec = recommendation.value;
    if (rec.rawSuggestedQty === 0) {
      const stockLabel = forecast.value.source === 'EXTERNAL_STORE_ITEM' 
        ? t('forecast.currentStockAtForecastLabel') 
        : t('forecast.stats.currentStock');
      return t('forecast.summaryMessages.sufficientStock', {
        stockLabel,
        stock: formatQty(rec.currentStock),
        demand: formatQty(totalHorizonDemand.value),
        days: selectedHorizon.value
      });
    }
    if (rec.rawSuggestedQty > 0 && rec.suggestedQty === 0) {
      return t('forecast.summaryMessages.capacityFull', {
        raw: formatQty(rec.rawSuggestedQty),
        avail: formatNumber(rec.warehouseAvailableM3)
      });
    }
    if (rec.capacityLimited) {
      return t('forecast.summaryMessages.capacityLimited', {
        raw: formatQty(rec.rawSuggestedQty),
        suggested: formatQty(rec.suggestedQty),
        shortfall: formatQty(rec.capacityShortfallQty)
      });
    }
    return t('forecast.summaryMessages.suggestedRestock', {
      suggested: formatQty(rec.suggestedQty)
    });
  }

  const rate = Number(forecast.value.forecast30d ?? 0);
  const stock = forecast.value.currentStock ?? 0;
  const minStock = forecast.value.minStock ?? 0;
  const rateText = formatNumber(rate);

  if (rate <= 0) {
    return t("forecast.summary.noData");
  }
  let text = "";
  if (stock <= minStock) {
    text = t("forecast.summary.urgent", { rate: rateText, stock: formatQty(stock), min: formatQty(minStock) });
  } else {
    const daysUntilMin = Math.max(0, Math.floor((stock - minStock) / rate));
    text = t("forecast.summary.normal", { rate: rateText, stock: formatQty(stock), days: daysUntilMin, min: formatQty(minStock) });
  }
  return text;
});

const displaySource = computed(() => {
  if (!forecast.value || !forecast.value.source) return t('forecast.dataSource.unknown');
  const src = forecast.value.source;
  if (src === "EXTERNAL_STORE_ITEM") {
    return t('forecast.dataSource.actual');
  }
  if (src === "EXTERNAL_RETAIL") {
    return t('forecast.dataSource.externalRetail');
  }
  if (src === "THUC_TE") {
    return t('forecast.dataSource.actual');
  }
  if (src === "SEED_DEMO") {
    return t('forecast.dataSource.demo');
  }
  return t('forecast.dataSource.unknown');
});

const displayDatasetType = computed(() => {
  if (!forecast.value || !forecast.value.datasetType) return "-";
  const type = forecast.value.datasetType;
  if (type === "EXTERNAL") return t('forecast.datasetType.external');
  if (type === "THUC_TE") return t('forecast.datasetType.actual');
  if (type === "COLD_START") return t('forecast.datasetType.coldStart');
  if (type === "LEGACY_UNKNOWN") return t('forecast.datasetType.unknown');
  return type;
});

const isStoreItemSupported = computed(() => {
  if (!selectedProductId.value || !selectedWarehouseId.value) return true;
  const prod = products.value.find(p => p.id === selectedProductId.value);
  const wh = warehouses.value.find(w => w.id === selectedWarehouseId.value);
  if (!prod || !wh) return true;

  const prodCode = (prod.code || prod.maSanPham || "").trim().toUpperCase();
  const whCode = (wh.code || wh.maKho || "").trim().toUpperCase();

  const prodMatch = prodCode.match(/^SP0*([1-9]\d*)$/);
  const whMatch = whCode.match(/^K0*([1-9]\d*)$/);

  if (prodMatch && whMatch) {
    const prodNum = parseInt(prodMatch[1], 10);
    const whNum = parseInt(whMatch[1], 10);
    return prodNum >= 1 && prodNum <= 50 && whNum >= 1 && whNum <= 3;
  }
  return false;
});

const showNoStoreItemHistoryState = computed(() => {
  if (!selectedProductId.value || !selectedWarehouseId.value) return false;
  return !isStoreItemSupported.value;
});

const isHistoryUnavailable = computed(() => {
  return forecast.value && (!forecast.value.dataDays || forecast.value.dataDays === 0 || !forecast.value.historical || forecast.value.historical.length === 0);
});

// Verify responsive check, light/dark mode support, and dropdown overflow safety.
</script>

<template>
  <PageHeader
    :title="t('forecast.title')"
    :description="t('forecast.description')"
  />

  <p v-if="errorMessage" class="form-alert form-alert-error">{{ errorMessage }}</p>
  <p v-if="successMessage" class="form-alert form-alert-success">{{ successMessage }}</p>

  <div class="card card-pad selector-bar flex-col !items-stretch">
    <!-- Nguồn dữ liệu row (Task 8 style polish) -->
    <div class="pb-4 mb-2 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-1">
      <div class="max-w-md">
        <label class="field-label">{{ t("forecast.filter.source") }}</label>
        <select v-model="selectedSource" class="select mt-1.5" :disabled="isLoadingDropdowns">
          <option value="EXTERNAL_STORE_ITEM">{{ t("forecast.dataSource.actual") }}</option>
          <option value="SEED_DEMO">{{ t("forecast.dataSource.demo") }}</option>
        </select>
        <span class="text-xs text-zinc-500 mt-1 block leading-relaxed">
          {{ t('forecast.helpText.' + (selectedSource === 'EXTERNAL_STORE_ITEM' ? 'actual' : 'demo')) }}
        </span>
      </div>
    </div>

    <template v-if="selectedSource !== 'EXTERNAL_STORE_ITEM' || availableCombinations.length > 0">
      <div class="flex flex-wrap gap-4 items-end w-full">
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
          <label class="field-label">{{ t('forecast.horizonLabel') }}</label>
          <select v-model="selectedHorizon" class="select" :disabled="isLoadingDropdowns">
            <option :value="7">{{ t('forecast.daysCount', { days: 7 }) }}</option>
            <option :value="14">{{ t('forecast.daysCount', { days: 14 }) }}</option>
            <option :value="30">{{ t('forecast.daysCount', { days: 30 }) }}</option>
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
            {{ t("forecast.button.checkDrift") }}
          </button>
        </div>
      </div>
    </template>
  </div>

  <template v-if="selectedSource === 'EXTERNAL_STORE_ITEM' && availableCombinations.length === 0">
    <div class="card card-pad mt-6">
      <EmptyState
        icon="mdi-database-off-outline"
        :title="t('forecast.empty.actualNoDataTitle')"
        :description="t('forecast.empty.actualNoDataDesc')"
      />
    </div>
  </template>
  <template v-else>
  <!-- Standalone card for Demo Seeding action (Task 3) -->
  <div v-if="selectedSource === 'SEED_DEMO'" class="card card-pad mb-6 flex items-center justify-between gap-4 flex-wrap bg-zinc-50/50 dark:bg-zinc-800/10 border-dashed border-indigo-200 dark:border-indigo-900/30">
    <div class="flex-1 min-w-[280px]">
      <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
        <i class="mdi mdi-database-cog text-indigo-500 text-base"></i>
        {{ t('forecast.demoSourceActionTitle') }}
      </h3>
      <p class="text-xs text-zinc-500 mt-1">
        {{ t('forecast.demoSourceActionDesc') }}
      </p>
    </div>
    <div class="flex items-center gap-4 flex-wrap shrink-0">
      <span v-if="availableCombinations.length > 0" class="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
        <i class="mdi mdi-check-circle-outline"></i>
        {{ t('forecast.hasDemoDataStatus') }}
      </span>
      <button
        class="btn btn-secondary btn-sm"
        type="button"
        :disabled="isSeedingHistory"
        @click="showSeedConfirmation = true"
      >
        <i class="mdi mr-1" :class="isSeedingHistory ? 'mdi-loading mdi-spin' : 'mdi-database-import'"></i>
        {{ isSeedingHistory ? t('forecast.button.seeding') : t('forecast.button.seed') }}
      </button>
    </div>
  </div>

  <div v-if="isLoadingForecast" class="inventory-loading card card-pad">
    <i class="mdi mdi-loading mdi-spin"></i>
    <span>{{ t("forecast.loading") }}</span>
  </div>

  <EmptyState
    v-else-if="showNoStoreItemHistoryState"
    :title="t('forecast.noHistoryState.title')"
    :description="t('forecast.noHistoryState.desc')"
    icon="mdi-database-alert-outline"
  />

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

  <EmptyState
    v-else-if="isHistoryUnavailable"
    :title="t('forecast.noHistoryState.insufficientTitle')"
    :description="t('forecast.noHistoryState.insufficientDesc')"
    icon="mdi-database-alert-outline"
  />

  <template v-else>
    <!-- Header / Context -->
    <div class="card card-pad summary-context-card">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <!-- Left: Model Info & Performance Metrics -->
        <div class="lg:col-span-7 flex flex-col justify-between gap-4">
          <div>
            <span class="text-xs uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">{{ t('forecast.infoTitle') }}</span>
            <div class="text-xs text-zinc-500 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{{ t('forecast.dataSourceLabel', { source: displaySource }) }}</span>
              <span v-if="forecast.datasetType">| {{ t('forecast.dataTypeLabel', { type: displayDatasetType }) }}</span>
            </div>
          </div>

          <!-- Model performance metrics - Grid of large cards matching source_full_kem_doc style -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="card card-pad stat-card">
              <span class="stat-label">{{ t('forecast.modeLabel') }}</span>
              <strong class="stat-value text-indigo-600 dark:text-indigo-400">
                {{ t('forecast.mode.' + forecast.mode) }}
              </strong>
              <span class="muted text-xs">
                <span v-if="forecast.mode === 'COLD_START_AVG'">
                  {{ t("forecast.stats.coldStartNote") }}
                </span>
                <span v-else>
                  {{ t("forecast.stats.dataDaysNote", { days: formatNumber(forecast.dataDays) }) }}
                </span>
              </span>
            </div>
            
            <div class="card card-pad stat-card">
              <span class="stat-label">{{ t('forecast.accuracyLabel') }}</span>
              <strong class="stat-value text-green-600 dark:text-green-400">
                {{ formatNumber(forecast.smape) }}%
              </strong>
              <span class="muted text-xs">{{ t('forecast.stats.smapeNote') }}</span>
            </div>
            
            <div class="card card-pad stat-card" v-if="(forecast.mae !== null && forecast.mae !== undefined) || (forecast.rmse !== null && forecast.rmse !== undefined)">
              <span class="stat-label">{{ t('forecast.maeRmseLabel') }}</span>
              <strong class="stat-value text-zinc-900 dark:text-zinc-100">
                {{ forecast.mae !== null ? formatNumber(forecast.mae) : '-' }} / {{ forecast.rmse !== null ? formatNumber(forecast.rmse) : '-' }}
              </strong>
              <span class="muted text-xs">{{ t('forecast.maeRmseSub') }}</span>
            </div>
          </div>
        </div>

        <!-- Right: Summary Recommendation Banner -->
        <div class="lg:col-span-5 flex flex-col">
          <div class="summary-banner mb-0 h-full">
            <div class="summary-banner__header">
              <i class="mdi mdi-lightbulb-on-outline summary-banner__icon animate-pulse"></i>
              <span class="summary-banner__title">{{ t('forecast.recommendationTitle') }}</span>
            </div>
            
            <div class="summary-banner__body">
              <p class="summary-banner__text">{{ summaryText }}</p>
            </div>
            
            <div class="summary-banner__footer">
              <span class="muted text-xs"><strong>{{ t('forecast.leadTimeCycle', { horizon: selectedHorizon }) }}</strong></span>
              <span v-if="isRecommendationValid" class="summary-banner__badge" :class="{
                'summary-banner__badge--need': recommendation.suggestedQty > 0,
                'summary-banner__badge--safe': recommendation.rawSuggestedQty === 0,
                'summary-banner__badge--warning': recommendation.rawSuggestedQty > 0 && recommendation.suggestedQty === 0
              }">
                {{ recommendation.suggestedQty > 0 ? t('forecast.badge.needRestock') : (recommendation.rawSuggestedQty === 0 ? t('forecast.badge.safe') : t('forecast.badge.cannotRestock')) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recommendation Loading / Empty / Loaded States -->
    <div v-if="isLoadingRecommendation" class="inventory-loading card card-pad mt-6">
      <i class="mdi mdi-loading mdi-spin mr-1"></i>
      <span>{{ t('forecast.loadingRecommendation') }}</span>
    </div>

    <template v-else>
      <!-- If recommendation is NOT valid, show the empty recommendation alert, but keep drawing the charts! -->
      <div v-if="!isRecommendationValid" class="py-12 text-center text-zinc-500 bg-zinc-50/50 dark:bg-zinc-800/10 rounded border border-dashed border-zinc-300 dark:border-zinc-700 mt-6">
        <i class="mdi mdi-alert-circle-outline text-3xl text-zinc-400 block mb-2"></i>
        {{ t('forecast.noRecommendation') }}
      </div>

      <!-- If recommendation IS valid, show the Summary Statistics Grid -->
      <div v-else class="stat-grid mt-6">
        <div class="card card-pad stat-card">
          <span class="stat-label">{{ t('forecast.demandForecastLabel', { horizon: selectedHorizon }) }}</span>
          <strong class="stat-value">{{ formatQty(totalHorizonDemand) }}</strong>
          <span class="text-xs text-[var(--color-text-secondary)] mt-1">{{ t('forecast.demandForecastSub') }}</span>
        </div>
        <div class="card card-pad stat-card">
          <span class="stat-label">{{ forecast?.source === 'EXTERNAL_STORE_ITEM' ? t('forecast.currentStockAtForecastLabel') : t('forecast.stats.currentStock') }}</span>
          <strong class="stat-value">{{ formatQty(recommendation.currentStock) }}</strong>
          <span class="text-xs text-[var(--color-text-secondary)] mt-1">{{ t('forecast.currentStockSub', { min: formatQty(recommendation.effectiveMinStock) }) }}</span>
        </div>
        <div class="card card-pad stat-card">
          <span class="stat-label">{{ t('forecast.rawNeedLabel') }}</span>
          <strong class="stat-value" :class="{ 'text-amber-500': recommendation.rawSuggestedQty > 0 }">
            {{ formatQty(recommendation.rawSuggestedQty) }}
          </strong>
          <span class="text-xs text-[var(--color-text-secondary)] mt-1">{{ t('forecast.rawNeedSub') }}</span>
        </div>
        <div class="card card-pad stat-card">
          <span class="stat-label">{{ t('forecast.actualProposalLabel') }}</span>
          <strong class="stat-value" :class="{
            'text-green-500': recommendation.suggestedQty > 0,
            'text-red-500': recommendation.suggestedQty === 0 && recommendation.rawSuggestedQty > 0
          }">
            {{ formatQty(recommendation.suggestedQty) }}
          </strong>
          <span class="text-xs text-[var(--color-text-secondary)] mt-1">{{ t('forecast.actualProposalSub') }}</span>
        </div>
      </div>

      <!-- Chart A: Actual vs Forecast -->
      <div class="card card-pad chart-card mt-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 class="section-title !mb-0">{{ t('forecast.actualVsForecastTitle') }}</h3>
          <div class="flex items-center gap-2 text-xs">
            <span class="text-zinc-500 font-medium">{{ t('forecast.historyLabel') }}</span>
            <input
              type="date"
              v-model="chartStartDate"
              :min="forecast.historyStartDate"
              :max="forecast.historyEndDate"
              class="border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span class="text-zinc-500 font-medium">{{ t('forecast.toLabel') }}</span>
            <input
              type="date"
              v-model="chartEndDate"
              :min="forecast.historyStartDate"
              :max="forecast.historyEndDate"
              class="border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <ActualForecastChart
          :historical="filteredHistorical"
          :forecast="forecast.dailyForecast || []"
          :boundary-date="boundaryDateStr"
          :horizon-days="selectedHorizon"
        />
      </div>

      <!-- Chart B: Projected Inventory (Task 5 Horizon sync) -->
      <div class="card card-pad chart-card mt-6">
        <h3 class="section-title">{{ t('forecast.projectedInventoryTitle') }}</h3>
        <ProjectedInventoryChart
          :current-stock="recommendation?.currentStock ?? forecast?.currentStock ?? 0"
          :daily-forecast="forecast?.dailyForecast || []"
          :effective-min-stock="recommendation?.effectiveMinStock ?? forecast?.minStock ?? 0"
          :boundary-date="boundaryDateStr"
          :horizon-days="selectedHorizon"
        />
      </div>

      <!-- Recommendation Detail & Capacity Warnings & Replenishment Assignment (Only if recommendation is valid) -->
      <template v-if="isRecommendationValid">
        <!-- Recommendation Detail & Capacity Warnings (Task 4 Capacity limitation UX) -->
        <div class="card card-pad chart-card mt-6">
          <h3 class="section-title">{{ t('forecast.detailCapacityTitle') }}</h3>
          <div class="py-2 text-sm text-zinc-700 dark:text-zinc-300 space-y-3">
            <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span>{{ t('forecast.capacityDetail.rawNeed') }}</span>
              <strong>{{ t('forecast.capacityDetail.rawNeedValue', { qty: formatQty(recommendation.rawSuggestedQty) }) }}</strong>
            </div>
            <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span>{{ t('forecast.capacityDetail.suggestedQty') }}</span>
              <strong>{{ t('forecast.capacityDetail.suggestedQtyValue', { qty: formatQty(recommendation.suggestedQty) }) }}</strong>
            </div>
            <div v-if="recommendation.capacityLimited" class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800 text-red-500 font-semibold">
              <span>{{ t('forecast.capacityDetail.shortfall') }}</span>
              <strong>{{ t('forecast.capacityDetail.shortfallValue', { qty: formatQty(recommendation.capacityShortfallQty) }) }}</strong>
            </div>

            <div class="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <h4 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{{ t('forecast.capacityDetail.warehouseCapacityTitle') }}</h4>
              <div class="grid grid-cols-2 gap-4 text-xs">
                <div>{{ t('forecast.capacityDetail.totalCapacity', { capacity: formatNumber(recommendation.warehouseCapacityM3) }) }}</div>
                <div>{{ t('forecast.capacityDetail.usedCapacity', { occupied: formatNumber(recommendation.warehouseOccupiedM3) }) }}</div>
                <div>{{ t('forecast.capacityDetail.availableCapacity', { available: formatNumber(recommendation.warehouseAvailableM3) }) }}</div>
                <div>{{ t('forecast.capacityDetail.maxQtyAllowed', { max: formatQty(recommendation.maxAdditionalUnitsByCapacity) }) }}</div>
              </div>
            </div>

            <div v-if="recommendation.capacityWarning" class="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-900/30 text-xs">
              <i class="mdi mdi-alert mr-1"></i>
              {{ recommendation.capacityWarning }}
            </div>
          </div>
        </div>

        <!-- Replenishment Assignment (Later Action Area - Task 6 Assignment context) -->
        <div v-if="canRun" class="card card-pad mt-6">
          <h3 class="section-title">{{ t('forecast.assignTaskTitle') }}</h3>
          <p class="text-sm text-zinc-500 mt-1">
            {{ t('forecast.assignTaskDesc') }}
          </p>
          <div class="mt-4">
            <button
              class="btn btn-primary"
              type="button"
              @click="openAssignmentModal"
            >
              <i class="mdi mdi-account-plus-outline mr-1"></i>
              {{ t('forecast.assignTaskBtn') }}
            </button>
          </div>
        </div>

        <!-- Assignment Modal -->
        <div
          v-if="showAssignmentModal"
          class="modal-backdrop"
          @click.self="showAssignmentModal = false"
        >
          <div class="modal">
            <div class="modal-head between">
              <div>
                <h2 class="section-title">{{ t('forecast.assignmentModal.title') }}</h2>
                <p class="modal-subtitle">{{ t('forecast.assignmentModal.subtitle') }}</p>
              </div>
              <button
                class="btn btn-icon"
                @click="showAssignmentModal = false"
              >
                <i class="mdi mdi-close"></i>
              </button>
            </div>

            <div class="modal-body space-y-4">
              <template v-if="!assignmentResult">
                <!-- Read-only Context Info -->
                <div class="p-3 bg-zinc-50 dark:bg-zinc-800/10 rounded border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                  <div>{{ t('forecast.assignmentModal.productLabel', { product: products.find(p => p.id === selectedProductId)?.name || products.find(p => p.id === selectedProductId)?.tenSanPham || selectedProductId }) }}</div>
                  <div>{{ t('forecast.assignmentModal.warehouseLabel', { warehouse: warehouses.find(w => w.id === selectedWarehouseId)?.name || warehouses.find(w => w.id === selectedWarehouseId)?.tenKho || selectedWarehouseId }) }}</div>
                  <div>{{ t('forecast.assignmentModal.horizonLabel', { horizon: selectedHorizon }) }}</div>
                  <div>{{ t('forecast.assignmentModal.aiQtyLabel', { qty: recommendation.suggestedQty }) }}</div>
                  <div v-if="recommendation.rawSuggestedQty !== recommendation.suggestedQty" class="text-zinc-500">{{ t('forecast.assignmentModal.rawNeedLabel', { qty: recommendation.rawSuggestedQty }) }}</div>
                  <div v-if="recommendation.capacityWarning" class="text-amber-600 dark:text-amber-400 font-semibold mt-1">{{ t('forecast.assignmentModal.capacityWarning', { warning: recommendation.capacityWarning }) }}</div>
                </div>

                <!-- Editable Form Fields -->
                <div class="field">
                  <label class="field-label font-semibold">{{ t('forecast.assignmentModal.employeeLabel') }}</label>
                  <select v-model="selectedEmployeeId" class="select w-full mt-1" :disabled="isSubmittingAssignment">
                    <option value="">{{ t('forecast.assignment.selectEmployee') }}</option>
                    <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                      {{ emp.name || emp.tenNhanVien }} ({{ emp.email }})
                    </option>
                  </select>
                </div>

                <div class="field mt-3">
                  <label class="field-label font-semibold">{{ t('forecast.assignmentModal.requestedQtyLabel') }}</label>
                  <input v-model.number="humanRequestedQuantity" type="number" min="1" class="input w-full mt-1" :disabled="isSubmittingAssignment" />
                  <span class="text-xs text-zinc-500 mt-1 block">
                    {{ t('forecast.assignmentModal.qtyHelp', { qty: recommendation.suggestedQty }) }}
                  </span>
                  <div v-if="humanRequestedQuantity > recommendation.suggestedQty" class="p-2 mt-1 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded text-xs border border-amber-200 dark:border-amber-900/30">
                    <i class="mdi mdi-information-outline mr-0.5"></i>
                    {{ t('forecast.assignmentModal.qtyExceedWarning', { qty: recommendation.suggestedQty }) }}
                  </div>
                </div>

                <div class="field mt-3">
                  <label class="field-label font-semibold">{{ t('forecast.assignmentModal.messageLabel') }}</label>
                  <textarea v-model="assignmentContent" rows="3" class="textarea w-full mt-1" :placeholder="t('forecast.assignmentModal.messagePlaceholder')" :disabled="isSubmittingAssignment"></textarea>
                </div>

                <div v-if="assignmentErrorMessage" class="p-3 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded border border-red-200 dark:border-red-900/30 text-xs mt-2">
                  <i class="mdi mdi-alert-circle-outline mr-1"></i>
                  {{ assignmentErrorMessage }}
                </div>
              </template>

              <template v-else>
                <!-- Success/Warning Alerts -->
                <div v-if="assignmentResult.emailStatus === 'DA_GUI'" class="p-3 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300 rounded border border-green-200 dark:border-green-900/30 text-xs">
                  <i class="mdi mdi-check-circle-outline mr-1"></i>
                  {{ t('forecast.assignment.createSuccess') }} {{ t('forecast.assignment.emailSent') }}
                </div>
                <div v-else-if="assignmentResult.emailStatus === 'THAT_BAI'" class="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-900/30 text-xs">
                  <div class="flex justify-between items-center gap-2">
                    <div class="flex items-center">
                      <i class="mdi mdi-alert-outline mr-1"></i>
                      <span>{{ t('forecast.assignment.emailFailed') }}</span>
                    </div>
                    <button
                      v-if="canRun"
                      class="btn btn-secondary btn-xs shrink-0"
                      type="button"
                      :disabled="isRetryingEmail"
                      @click="handleRetryEmail"
                    >
                      <i class="mdi mr-0.5" :class="isRetryingEmail ? 'mdi-loading mdi-spin' : 'mdi-email-sync-outline'"></i>
                      {{ isRetryingEmail ? t('forecast.assignment.retryingEmail') : t('forecast.assignment.retryEmail') }}
                    </button>
                  </div>
                </div>
                <div v-else class="p-3 bg-zinc-50 dark:bg-zinc-800/20 text-zinc-800 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-800 text-xs">
                  <i class="mdi mdi-clock-outline mr-1"></i>
                  {{ t('forecast.assignment.emailPending') }}
                </div>

                <!-- Compact Details Table -->
                <div class="p-4 bg-zinc-50 dark:bg-zinc-800/10 rounded border border-zinc-200 dark:border-zinc-800 text-xs space-y-3">
                  <h4 class="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[10px]">{{ t('forecast.assignment.resultTitle') }}</h4>

                  <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                    <span class="text-zinc-500">{{ t('forecast.assignment.code') }}:</span>
                    <strong class="text-zinc-900 dark:text-zinc-100">{{ assignmentResult.code || assignmentResult.id }}</strong>
                  </div>
                  <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                    <span class="text-zinc-500">{{ t('forecast.assignment.receiver') }}:</span>
                    <strong>
                      {{ assignmentResult.receiver?.name || assignmentResult.receiver?.tenNhanVien || employees.find(e => e.id === assignmentResult.receiverId)?.name || employees.find(e => e.id === assignmentResult.receiverId)?.tenNhanVien || assignmentResult.receiverId }}
                    </strong>
                  </div>
                  <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                    <span class="text-zinc-500">{{ t('forecast.assignment.aiQty') }}:</span>
                    <strong>{{ formatQty(assignmentResult.aiSuggestedQuantity ?? assignmentResult.aiSuggestedQty) }}</strong>
                  </div>
                  <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                    <span class="text-zinc-500">{{ t('forecast.assignment.reqQty') }}:</span>
                    <strong class="text-zinc-900 dark:text-zinc-100">{{ formatQty(assignmentResult.requestedQuantity) }}</strong>
                  </div>
                  <div class="flex justify-between py-1">
                    <span class="text-zinc-500">{{ t('forecast.assignment.emailStatus') }}:</span>
                    <span class="font-semibold" :class="{
                      'text-green-600': assignmentResult.emailStatus === 'DA_GUI',
                      'text-amber-600': assignmentResult.emailStatus === 'THAT_BAI',
                      'text-zinc-500': assignmentResult.emailStatus === 'CHO_GUI'
                    }">
                      {{ assignmentResult.emailStatus === 'DA_GUI' ? t('forecast.assignment.emailStatusSent') : (assignmentResult.emailStatus === 'THAT_BAI' ? t('forecast.assignment.emailStatusFailed') : t('forecast.assignment.emailStatusPending')) }}
                    </span>
                  </div>
                </div>

                <!-- General message for retry result/errors -->
                <div v-if="assignmentErrorMessage" class="p-3 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded border border-red-200 dark:border-red-900/30 text-xs">
                  <i class="mdi mdi-alert-circle-outline mr-1"></i>
                  {{ assignmentErrorMessage }}
                </div>
                <div v-if="assignmentSuccessMessage" class="p-3 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300 rounded border border-green-200 dark:border-green-900/30 text-xs">
                  <i class="mdi mdi-check-circle-outline mr-1"></i>
                  {{ assignmentSuccessMessage }}
                </div>
              </template>
            </div>

            <div class="modal-foot">
              <template v-if="!assignmentResult">
                <button
                  class="btn btn-ghost"
                  :disabled="isSubmittingAssignment"
                  @click="showAssignmentModal = false"
                >
                  {{ t('forecast.assignmentModal.cancelBtn') }}
                </button>
                <button
                  class="btn btn-primary"
                  :disabled="isSubmittingAssignment"
                  @click="submitAssignment"
                >
                  <i v-if="isSubmittingAssignment" class="mdi mdi-loading mdi-spin mr-1"></i>
                  {{ t('forecast.assignmentModal.assignBtn') }}
                </button>
              </template>
              <template v-else>
                <button
                  class="btn btn-primary"
                  @click="showAssignmentModal = false"
                >
                  {{ t('forecast.assignmentModal.closeBtn') }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Drift Card (Drift/Model Drift check results) -->
    <div v-if="drift" ref="driftCardRef" class="card card-pad drift-card mt-6">
      <h3 class="section-title">{{ t("forecast.drift.title") }}</h3>
      <div class="drift-row">
        <StatusBadge :status="driftBadgeVariant(drift.status)" />
        <span class="font-semibold">{{ t('forecast.drift.status.' + drift.status) }}</span>
      </div>
      <div v-if="drift.rollingSmape !== null && drift.rollingSmape !== undefined" class="drift-metrics">
        <div class="drift-metric-item">
          <span class="drift-metric-label">{{ t('forecast.drift.rollingSmape') }}</span>
          <strong class="drift-metric-value" :class="drift.retrainNeeded ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'">
            {{ formatNumber(drift.rollingSmape) }}%
          </strong>
        </div>
        <div class="drift-metric-item">
          <span class="drift-metric-label">{{ t('forecast.drift.driftThreshold') }}</span>
          <strong class="drift-metric-value">{{ formatNumber(drift.threshold) }}%</strong>
        </div>
        <div class="drift-metric-item">
          <span class="drift-metric-label">{{ t('forecast.drift.comparisonDays') }}</span>
          <strong class="drift-metric-value">{{ t('forecast.drift.daysValue', { days: drift.overlapDays }) }}</strong>
        </div>
      </div>
      <div v-if="drift.status === 'NO_ACTUAL_DATA'" class="drift-explain">
        <i class="mdi mdi-information-outline"></i>
        <span>{{ t('forecast.drift.rules.noActualData') }}</span>
      </div>
      <div v-else-if="drift.status === 'NO_FORECAST_DATA'" class="drift-explain">
        <i class="mdi mdi-information-outline"></i>
        <span>{{ t('forecast.drift.rules.noForecastData') }}</span>
      </div>
      <div v-else-if="drift.status === 'INSUFFICIENT_OVERLAP'" class="drift-explain">
        <i class="mdi mdi-information-outline"></i>
        <span>{{ t('forecast.drift.rules.insufficientOverlap', { days: drift.overlapDays }) }}</span>
      </div>
      <div class="drift-rule">
        <i class="mdi mdi-help-circle-outline"></i>
        <span>{{ t('forecast.drift.rules.driftCondition', { threshold: formatNumber(drift.threshold) }) }}</span>
      </div>
      <div v-if="drift.retrainNeeded" class="drift-action">
        <i class="mdi mdi-refresh-circle text-[var(--color-warning)]"></i>
        <span>{{ t('forecast.drift.rules.driftAction') }}</span>
      </div>
    </div>
  </template>
  <ConfirmDialog
    :open="showSeedConfirmation"
    :title="t('forecast.seedConfirmationTitle')"
    :subtitle="t('forecast.seedConfirmationSubtitle')"
    :message="t('forecast.seedConfirmationBody')"
    :confirm-text="t('forecast.seedConfirmBtn')"
    :loading="isSeedingHistory"
    @cancel="showSeedConfirmation = false"
    @confirm="handleSeedHistory"
  />
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
  flex-direction: column;
  justify-content: space-between;
  margin: 0;
  padding: 20px;
  height: 100%;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(37, 99, 235, 0.01));
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 12px;
  color: var(--color-text-primary);
}

.summary-banner__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(37, 99, 235, 0.1);
}

.summary-banner__title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--color-action-primary);
  letter-spacing: 0.05em;
}

.summary-banner__icon {
  font-size: 18px;
  color: var(--color-action-primary);
}

.summary-banner__body {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 16px 0;
}

.summary-banner__text {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
  color: var(--color-text-primary);
  margin: 0;
}

.summary-banner__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(37, 99, 235, 0.1);
  font-size: 12px;
}

.summary-banner__badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
}

.summary-banner__badge--safe {
  background: var(--color-success-soft);
  color: var(--color-success);
  border: 1px solid rgba(22, 130, 93, 0.15);
}

.summary-banner__badge--need {
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  border: 1px solid rgba(37, 99, 235, 0.15);
}

.summary-banner__badge--warning {
  background: var(--color-warning-soft);
  color: var(--color-warning);
  border: 1px solid rgba(217, 119, 6, 0.15);
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
