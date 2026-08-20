<script setup>
import { computed, onMounted, ref, reactive, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { getPendingExportReceipts } from "../services/exportReceiptService";
import {
  getInventory,
  getLowStockInventory,
  getInventoryTransactions,
} from "../services/inventoryService";
import { getPendingApprovals } from "../services/importReceiptService";
import { getProducts } from "../services/productService";
import { canAccessRoute, canCreateImportReceipt, canCreateExportReceipt } from "../services/permissionService";
import { getWarehouses, getWarehouseCapacity } from "../services/warehouseService";
import {
  getDashboardOverview,
  getInventoryMovement,
  getStockHealth,
  getWarehouseDistribution
} from "../services/dashboardService";
import { useAuthStore } from "../stores/auth";
import { useLayoutStore } from "../stores/layout";
import { useI18n } from 'vue-i18n';
import ApexCharts from "vue3-apexcharts";

defineOptions({
  components: { ApexCharts },
});

const router = useRouter();
const authStore = useAuthStore();
const layoutStore = useLayoutStore();
const { t, locale } = useI18n();

const isLoading = ref(true);
const isRetrying = ref(false);
const errorMessage = ref("");
const summary = ref({ products: 0, warehouses: 0, stock: 0, warnings: 0 });
const dashboardOverview = ref(null);
const dashboardOverviewFailed = ref(false);
const pendingImportItems = ref([]);
const pendingImportFailed = ref(false);
const pendingExportItems = ref([]);
const pendingExportFailed = ref(false);
const lowStockItems = ref([]);
const lowStockFailed = ref(false);
const productCountFailed = ref(false);
const warehouseCountFailed = ref(false);
const warningCountFailed = ref(false);
const stockTotalFailed = ref(false);

const recentTransactions = ref([]);
const recentTransactionsFailed = ref(false);

// Analytics State
const movementData = ref([]);
const isMovementLoading = ref(true);
const movementFailed = ref(false);

const stockHealthData = ref(null);
const isStockHealthLoading = ref(true);
const stockHealthFailed = ref(false);

const warehouseDistData = ref([]);
const isWarehouseDistLoading = ref(true);
const warehouseDistFailed = ref(false);

const movementWarehouseId = ref("");
const warehouseList = ref([]);
// Date Picker & Calendar State for Chart
const selectedDaysRange = ref(90);
const movementStartDate = ref(new Date());
// Default to 90 days ending today (start date is today - 89 days)
const defaultStart = new Date();
defaultStart.setDate(defaultStart.getDate() - 89);
movementStartDate.value = defaultStart;

const movementEndDate = computed(() => {
  const end = new Date(movementStartDate.value);
  end.setDate(end.getDate() + selectedDaysRange.value - 1);
  return end;
});

function changeDaysRange(days) {
  selectedDaysRange.value = days;
  const newStart = new Date();
  newStart.setDate(newStart.getDate() - days + 1);
  movementStartDate.value = newStart;
  fetchMovementData();
}

const isCalendarOpen = ref(false);
const datepickerContainer = ref(null);

const calendarMonth = ref(new Date().getMonth());
const calendarYear = ref(new Date().getFullYear());
const selectedTempDate = ref(new Date());

const currentUser = computed(() => authStore.currentUser);
const currentUserName = computed(() => currentUser.value?.hoTen || currentUser.value?.fullName || "");

const canSeeImportApprovals = computed(() => canAccessRoute("/approvals"));
const canSeeExportApprovals = computed(() => canAccessRoute("/approvals"));
const canSeeWarnings = computed(() => canAccessRoute("/inventory"));
const canSeeAlerts = computed(() => canAccessRoute("/alerts"));
const canSeeProducts = computed(() => canAccessRoute("/products"));
const canSeeWarehouses = computed(() => canAccessRoute("/warehouses"));
const canSeeDashboardOverview = computed(
  () =>
    canSeeWarnings.value ||
    canSeeAlerts.value ||
    canSeeImportApprovals.value ||
    canSeeExportApprovals.value,
);

const pendingApprovalsTotal = computed(() => {
  const importReceipts = canSeeImportApprovals.value
    ? Number(dashboardOverview.value?.pendingTasks?.importReceipts || 0)
    : 0;
  const exportReceipts = canSeeExportApprovals.value
    ? Number(dashboardOverview.value?.pendingTasks?.exportReceipts || 0)
    : 0;

  return importReceipts + exportReceipts;
});

const hasAnyApiError = computed(() => {
  return (
    Boolean(errorMessage.value) ||
    dashboardOverviewFailed.value ||
    pendingImportFailed.value ||
    pendingExportFailed.value ||
    lowStockFailed.value ||
    productCountFailed.value ||
    warehouseCountFailed.value ||
    stockTotalFailed.value ||
    warningCountFailed.value ||
    recentTransactionsFailed.value
  );
});

const dashboardAlertMessage = computed(() => {
  if (errorMessage.value) {
    return errorMessage.value;
  }

  if (hasAnyApiError.value) {
    return "Một số dữ liệu trên dashboard chưa tải được. Vui lòng làm mới trang.";
  }

  return "";
});

const hasDashboardData = computed(() => {
  const values = { ...summary.value };
  if (!canSeeWarnings.value) {
    delete values.warnings;
    delete values.stock;
  }

  const hasSummaryData = Object.values(values).some(
    (value) => Number(value) > 0,
  );
  const hasPendingApprovals =
    pendingImportItems.value.length || pendingExportItems.value.length;
  const hasLowStockAlerts = lowStockItems.value.length > 0;
  const hasPendingSectionErrors =
    pendingImportFailed.value || pendingExportFailed.value;
  const hasLowStockSectionError = lowStockFailed.value;

  const hasWarningLoadError = warningCountFailed.value === true;
  const hasStockLoadError = stockTotalFailed.value === true;

  return (
    hasSummaryData ||
    hasPendingApprovals ||
    hasLowStockAlerts ||
    hasPendingSectionErrors ||
    hasLowStockSectionError ||
    hasWarningLoadError ||
    hasStockLoadError ||
    productCountFailed.value ||
    warehouseCountFailed.value ||
    recentTransactions.value.length > 0
  );
});

const visibleQuickActions = computed(() => {
  const actions = [];
  const role = authStore.currentRole;

  if (role === "ADMIN") {
    actions.push({ title: t('dashboard.actionCreateImport'), icon: "mdi-tray-arrow-down", route: "/stock-in/create" });
    actions.push({ title: t('dashboard.actionCreateExport'), icon: "mdi-tray-arrow-up", route: "/stock-out/create" });
    actions.push({ title: t('dashboard.actionApproveImport'), icon: "mdi-check-decagram-outline", route: "/approvals" });
    actions.push({ title: t('dashboard.actionApproveExport'), icon: "mdi-file-clock-outline", route: "/approvals?type=out" });
    actions.push({ title: t('dashboard.actionImportExcel'), icon: "mdi-file-excel-outline", route: "/import-excel" });
  } else if (role === "MANAGER") {
    actions.push({ title: t('dashboard.actionApproveImport'), icon: "mdi-check-decagram-outline", route: "/approvals" });
    actions.push({ title: t('dashboard.actionApproveExport'), icon: "mdi-file-clock-outline", route: "/approvals?type=out" });
    actions.push({ title: t('sidebar.menu.stockIn'), icon: "mdi-tray-arrow-down", route: "/stock-in" });
    actions.push({ title: t('sidebar.menu.stockOut'), icon: "mdi-tray-arrow-up", route: "/stock-out" });
    actions.push({ title: t('dashboard.actionImportExcel'), icon: "mdi-file-excel-outline", route: "/import-excel" });
  } else if (role === "EMPLOYEE") {
    actions.push({ title: t('dashboard.actionCreateImport'), icon: "mdi-tray-arrow-down", route: "/stock-in/create" });
    actions.push({ title: t('dashboard.actionCreateExport'), icon: "mdi-tray-arrow-up", route: "/stock-out/create" });
    actions.push({ title: t('dashboard.actionMyImports'), icon: "mdi-tray-arrow-down", route: "/stock-in" });
    actions.push({ title: t('dashboard.actionMyExports'), icon: "mdi-tray-arrow-up", route: "/stock-out" });
    actions.push({ title: t('dashboard.actionImportExcel'), icon: "mdi-file-excel-outline", route: "/import-excel" });
  }

  return actions.filter(act => canAccessRoute(act.route));
});

onMounted(() => {
  loadDashboardData(true);
  loadAnalyticsData();
});

function handleSessionExpired() {
  isLoading.value = false;
  isRetrying.value = false;
  router.replace("/login");
}

function shouldRedirectForSessionError(error) {
  if (error?.status === 401) {
    handleSessionExpired();
    return true;
  }

  return false;
}

async function loadDashboardData(forceReload = false) {
  if (isLoading.value && !forceReload) {
    return;
  }

  isLoading.value = true;
  isRetrying.value = true;
  errorMessage.value = "";
  dashboardOverview.value = null;
  dashboardOverviewFailed.value = false;
  pendingImportItems.value = [];
  pendingImportFailed.value = false;
  pendingExportItems.value = [];
  pendingExportFailed.value = false;
  lowStockItems.value = [];
  lowStockFailed.value = false;
  productCountFailed.value = false;
  warehouseCountFailed.value = false;
  warningCountFailed.value = false;
  stockTotalFailed.value = false;
  recentTransactions.value = [];
  recentTransactionsFailed.value = false;
  summary.value = { products: 0, warehouses: 0, stock: 0, warnings: 0 };

  try {
    const requests = [];

    if (canSeeDashboardOverview.value) {
      requests.push(loadDashboardOverview());
    } else {
      requests.push(Promise.resolve(null));
    }

    if (canSeeProducts.value) {
      requests.push(loadProductCount());
    } else {
      requests.push(Promise.resolve(0));
    }

    if (canSeeWarehouses.value) {
      requests.push(loadWarehouseCount());
    } else {
      requests.push(Promise.resolve(0));
    }

    const [overviewResultValue, productsCountResult, warehouseCountResult] =
      await Promise.allSettled(requests);

    const productsResult = productsCountResult ?? { status: "fulfilled", value: 0 };
    const warehouseResult = warehouseCountResult ?? { status: "fulfilled", value: 0 };

    let productsResponse = 0;
    let warehouseData = 0;
    let stockTotal = null;
    let warningCount = 0;

    if (overviewResultValue.status === "fulfilled") {
      dashboardOverview.value = overviewResultValue.value;
      dashboardOverviewFailed.value = false;
    } else {
      dashboardOverview.value = null;
      dashboardOverviewFailed.value = true;
      if (shouldRedirectForSessionError(overviewResultValue.reason)) {
        return;
      }

      errorMessage.value =
        overviewResultValue.reason?.message ||
        "Không thể tải dữ liệu dashboard.";
    }

    if (productsResult.status === "fulfilled") {
      productsResponse = productsResult.value;
      productCountFailed.value = false;
    } else {
      productCountFailed.value = true;
      if (shouldRedirectForSessionError(productsResult.reason)) {
        return;
      }
    }

    if (warehouseResult.status === "fulfilled") {
      warehouseData = warehouseResult.value;
      warehouseCountFailed.value = false;
    } else {
      warehouseCountFailed.value = true;
      if (shouldRedirectForSessionError(warehouseResult.reason)) {
        return;
      }
    }

    if (canSeeWarnings.value) {
      try {
        stockTotal = await loadStockTotal();
        stockTotalFailed.value = false;
      } catch (error) {
        if (shouldRedirectForSessionError(error)) {
          return;
        }

        stockTotal = null;
        stockTotalFailed.value = true;
      }

      try {
        warningCount = await loadLowStockCount();
      } catch (error) {
        if (shouldRedirectForSessionError(error)) {
          return;
        }

        warningCountFailed.value = true;
      }
    }

    summary.value = {
      products: productsResponse,
      warehouses: warehouseData,
      stock: canSeeWarnings.value ? stockTotal : 0,
      warnings: warningCountFailed.value ? null : warningCount,
    };
  } catch (error) {
    errorMessage.value = error?.message || "Không thể tải dữ liệu tổng quan.";
    if (shouldRedirectForSessionError(error)) {
      return;
    }
  }

  try {
    // 1. Fetch pending approvals if allowed
    if (canSeeImportApprovals.value || canSeeExportApprovals.value) {
      const pendingData = await loadPendingApprovals();
      pendingImportItems.value = pendingData.importItems;
      pendingImportFailed.value = pendingData.importFailed;
      pendingExportItems.value = pendingData.exportItems;
      pendingExportFailed.value = pendingData.exportFailed;
    } else {
      pendingImportItems.value = [];
      pendingImportFailed.value = false;
      pendingExportItems.value = [];
      pendingExportFailed.value = false;
    }

    // 2. Fetch low stock items if allowed
    if (canSeeWarnings.value) {
      const lowStockData = await loadLowStockItems();
      lowStockItems.value = lowStockData.items;
      lowStockFailed.value = lowStockData.failed;
    } else {
      lowStockItems.value = [];
      lowStockFailed.value = false;
    }

    // 3. Fetch recent transactions
    if (canSeeWarnings.value) {
      const transData = await getInventoryTransactions({ page: 0, size: 5 });
      recentTransactions.value = transData.content || [];
      recentTransactionsFailed.value = false;
    } else {
      recentTransactions.value = [];
      recentTransactionsFailed.value = false;
    }
  } catch (error) {
    if (shouldRedirectForSessionError(error)) {
      return;
    }

    pendingImportItems.value = [];
    pendingImportFailed.value = true;
    pendingExportItems.value = [];
    pendingExportFailed.value = true;
    lowStockItems.value = [];
    lowStockFailed.value = true;
    recentTransactions.value = [];
    recentTransactionsFailed.value = true;
  } finally {
    isLoading.value = false;
    isRetrying.value = false;
  }
}

async function retryDashboardLoad() {
  if (isLoading.value) {
    return;
  }

  loadDashboardData(true);
  loadAnalyticsData();
}

async function loadProductCount() {
  const data = await getProducts({ page: 0, size: 1 });
  return Number(data?.totalElements || 0);
}

async function loadWarehouseCount() {
  const data = await getWarehouses();
  return Number(Array.isArray(data) ? data.length : (data?.totalElements || 0));
}

async function loadStockTotal() {
  try {
    const data = await getInventory({ page: 0, size: 1 });
    const aggregateValue = Number(
      data?.stockTotal ?? data?.totalStock ?? data?.total ?? 0,
    );

    if (Number.isFinite(aggregateValue) && aggregateValue >= 0) {
      return aggregateValue;
    }
  } catch (error) {
    if (error?.status === 401) {
      throw error;
    }

    const wrappedError = new Error("Không thể tải tổng tồn kho.");
    wrappedError.status = error?.status;
    wrappedError.errors = error?.errors;
    throw wrappedError;
  }

  return 0;
}

async function loadLowStockCount() {
  const data = await getLowStockInventory({ page: 0, size: 1 });
  return Number(data?.totalElements || 0);
}

async function loadDashboardOverview() {
  return await getDashboardOverview();
}

async function loadPendingApprovals() {
  const importItems = [];
  const exportItems = [];
  let importFailed = false;
  let exportFailed = false;

  if (canSeeImportApprovals.value) {
    try {
      const importData = await getPendingApprovals({ page: 0, size: 5 });
      importItems.push(
        ...(Array.isArray(importData?.content) ? importData.content : []).map(
          (item) => ({
            id: item.id,
            code: item.code || item.maPhieuNhap,
            label: item.supplierName || item.partnerName || "Phiếu nhập",
            subtitle: item.warehouseName || "Kho",
            route: "/approvals",
          }),
        ),
      );
    } catch (error) {
      if (error?.status === 401) {
        throw error;
      }

      importFailed = true;
    }
  }

  if (canSeeExportApprovals.value) {
    try {
      const exportData = await getPendingExportReceipts({ page: 0, size: 5 });
      exportItems.push(
        ...(Array.isArray(exportData?.content) ? exportData.content : []).map(
          (item) => ({
            id: item.id,
            code: item.code || item.maPhieuXuat,
            label: item.warehouseName || "Phiếu xuất",
            subtitle: item.status || "Chờ duyệt",
            route: "/approvals?type=out",
          }),
        ),
      );
    } catch (error) {
      if (error?.status === 401) {
        throw error;
      }

      exportFailed = true;
    }
  }

  return {
    importItems,
    exportItems,
    importFailed,
    exportFailed,
  };
}

async function loadLowStockItems() {
  try {
    const data = await getLowStockInventory({ page: 0, size: 5 });
    const items = Array.isArray(data?.content)
      ? data.content.map((item) => {
          // Backend severity semantics: quantity <= 0 OR OUT_OF_STOCK -> CRITICAL, otherwise -> WARNING
          const severity = (item.currentQuantity <= 0 || item.status === "OUT_OF_STOCK") ? "CRITICAL" : "WARNING";
          return {
            id: item.inventoryId || item.productId,
            productCode: item.productCode || "SP",
            productName: item.productName || "Sản phẩm",
            warehouseName: item.warehouse || item.warehouseName || "Kho",
            available: item.currentQuantity ?? 0,
            minStock: item.minStock ?? 0,
            severity,
          };
        })
      : [];

    return { items, failed: false };
  } catch (error) {
    if (error?.status === 401) {
      throw error;
    }

    return { items: [], failed: true };
  }
}

function formatNumber(value) {
  const normalizedValue = Number(value);
  if (value === null || value === undefined || Number.isNaN(normalizedValue)) {
    return "—";
  }

  return new Intl.NumberFormat("vi-VN").format(normalizedValue);
}

function openRoute(path) {
  if (!path) return;
  if (canAccessRoute(path)) {
    router.push(path);
  }
}

function getTransactionTypeLabel(type) {
  const transactionTypeOptions = [
    { value: "NHAP_KHO", label: "sidebar.menu.stockIn" },
    { value: "XUAT_KHO", label: "sidebar.menu.stockOut" },
    { value: "NHAP_DAU_KY", label: "dashboard.initialInbound" },
    { value: "DIEU_CHINH_TANG", label: "dashboard.adjustmentIncrease" },
    { value: "DIEU_CHINH_GIAM", label: "dashboard.adjustmentDecrease" },
  ];
  return transactionTypeOptions.find((option) => option.value === type)?.label || "dashboard.unknown";
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

function viewDocumentDetail(type, documentId) {
  const path = type === 'in' ? `/stock-in/${documentId}` : `/stock-out/${documentId}`;
  router.push(path);
}

// Format display date: DD/MM/YYYY
function formatLocalDateDisplay(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format API date: YYYY-MM-DD
function formatLocalDateApi(date) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previous90Days() {
  const newStart = new Date(movementStartDate.value);
  newStart.setDate(newStart.getDate() - selectedDaysRange.value);
  movementStartDate.value = newStart;
  fetchMovementData();
}

function next90Days() {
  const newStart = new Date(movementStartDate.value);
  newStart.setDate(newStart.getDate() + selectedDaysRange.value);
  movementStartDate.value = newStart;
  fetchMovementData();
}

function toggleCalendar(event) {
  if (isCalendarOpen.value) {
    closeCalendar();
  } else {
    if (event) event.stopPropagation();
    openCalendar();
  }
}

function openCalendar() {
  selectedTempDate.value = new Date(movementStartDate.value);
  calendarMonth.value = selectedTempDate.value.getMonth();
  calendarYear.value = selectedTempDate.value.getFullYear();
  isCalendarOpen.value = true;
  document.addEventListener("click", handleDocumentClick);
}

function closeCalendar() {
  isCalendarOpen.value = false;
  document.removeEventListener("click", handleDocumentClick);
}

function handleDocumentClick(event) {
  if (
    isCalendarOpen.value &&
    datepickerContainer.value &&
    !datepickerContainer.value.contains(event.target)
  ) {
    closeCalendar();
  }
}

function applyCalendar() {
  movementStartDate.value = new Date(selectedTempDate.value);
  closeCalendar();
  fetchMovementData();
}

function prevMonth() {
  if (calendarMonth.value === 0) {
    calendarMonth.value = 11;
    calendarYear.value -= 1;
  } else {
    calendarMonth.value -= 1;
  }
}

function nextMonth() {
  if (calendarMonth.value === 11) {
    calendarMonth.value = 0;
    calendarYear.value += 1;
  } else {
    calendarMonth.value += 1;
  }
}

function selectTempDate(date) {
  selectedTempDate.value = new Date(date);
  calendarMonth.value = date.getMonth();
  calendarYear.value = date.getFullYear();
}

const calendarWeekdays = computed(() => {
  return locale.value === "en"
    ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
    : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
});

const calendarTitle = computed(() => {
  const month = calendarMonth.value;
  const year = calendarYear.value;
  if (locale.value === "en") {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${monthNames[month]} ${year}`;
  } else {
    return `Tháng ${String(month + 1).padStart(2, '0')} / ${year}`;
  }
});

const calendarDays = computed(() => {
  const days = [];
  const year = calendarYear.value;
  const month = calendarMonth.value;

  const firstDay = new Date(year, month, 1);
  let startOffset = firstDay.getDay() - 1; // 0 for Mon, 6 for Sun
  if (startOffset === -1) startOffset = 6;

  // Previous month tail days
  const prevMonthDate = new Date(year, month, 0);
  const prevMonthDaysCount = prevMonthDate.getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const dayNum = prevMonthDaysCount - i;
    const d = new Date(year, month - 1, dayNum);
    days.push({
      id: `prev-${dayNum}`,
      dayNumber: dayNum,
      date: d,
      isCurrentMonth: false,
    });
  }

  // Current month days
  const currentMonthDaysCount = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= currentMonthDaysCount; i++) {
    const d = new Date(year, month, i);
    days.push({
      id: `curr-${i}`,
      dayNumber: i,
      date: d,
      isCurrentMonth: true,
    });
  }

  // Next month leading days (complete 42 cells)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({
      id: `next-${i}`,
      dayNumber: i,
      date: d,
      isCurrentMonth: false,
    });
  }

  return days;
});

function getDayClass(day) {
  const isSelected =
    selectedTempDate.value &&
    day.date.getDate() === selectedTempDate.value.getDate() &&
    day.date.getMonth() === selectedTempDate.value.getMonth() &&
    day.date.getFullYear() === selectedTempDate.value.getFullYear();

  const today = new Date();
  const isToday =
    day.date.getDate() === today.getDate() &&
    day.date.getMonth() === today.getMonth() &&
    day.date.getFullYear() === today.getFullYear();

  let classes = "";
  if (isSelected) {
    classes = "selected";
  } else if (isToday) {
    classes = "today";
  }

  if (day.isCurrentMonth) {
    classes += " current-month";
  } else {
    classes += " other-month";
  }

  return classes;
}

async function loadWarehouseDropdown() {
  try {
    const data = await getWarehouses();
    warehouseList.value = Array.isArray(data) ? data : (data?.content || []);
  } catch (error) {
    console.error("Failed to load warehouses for dropdown:", error);
  }
}

async function fetchMovementData() {
  isMovementLoading.value = true;
  movementFailed.value = false;
  
  const from = formatLocalDateApi(movementStartDate.value);
  const to = formatLocalDateApi(movementEndDate.value);
  const params = {
    from,
    to,
    warehouseId: movementWarehouseId.value || undefined,
  };
  
  try {
    const data = await getInventoryMovement(params);
    movementData.value = Array.isArray(data) ? data : [];
  } catch (error) {
    if (shouldRedirectForSessionError(error)) return;
    movementFailed.value = true;
  } finally {
    isMovementLoading.value = false;
  }
}

async function fetchStockHealth() {
  isStockHealthLoading.value = true;
  stockHealthFailed.value = false;
  
  try {
    stockHealthData.value = await getStockHealth();
  } catch (error) {
    if (shouldRedirectForSessionError(error)) return;
    stockHealthFailed.value = true;
  } finally {
    isStockHealthLoading.value = false;
  }
}

async function fetchWarehouseDistribution() {
  isWarehouseDistLoading.value = true;
  warehouseDistFailed.value = false;
  
  try {
    const data = await getWarehouseDistribution();
    warehouseDistData.value = Array.isArray(data) ? data : [];
  } catch (error) {
    if (shouldRedirectForSessionError(error)) return;
    warehouseDistFailed.value = true;
  } finally {
    isWarehouseDistLoading.value = false;
  }
}

const warehouseCapacities = ref([]);
const isLoadingCapacities = ref(false);

async function fetchWarehouseCapacities() {
  isLoadingCapacities.value = true;
  try {
    const list = await getWarehouses({ status: 'HOAT_DONG' });
    const results = await Promise.allSettled(list.map(w => getWarehouseCapacity(w.id)));
    const capacities = [];
    list.forEach((w, i) => {
      if (results[i].status === 'fulfilled' && results[i].value) {
        const cap = results[i].value;
        capacities.push({
          id: w.id,
          name: w.tenKho,
          code: w.maKho,
          usedVolume: cap.usedCapacityM3 || 0,
          maxVolume: cap.maxCapacityM3 || 0,
          usagePercentage: cap.usagePercentage || 0
        });
      }
    });
    warehouseCapacities.value = capacities.sort((a, b) => b.usagePercentage - a.usagePercentage);
  } catch (err) {
    console.error('Failed to load capacities for dashboard:', err);
  } finally {
    isLoadingCapacities.value = false;
  }
}

function loadAnalyticsData() {
  loadWarehouseDropdown().then(() => {
    fetchMovementData();
  });
  
  Promise.allSettled([
    fetchStockHealth(),
    fetchWarehouseDistribution(),
    fetchWarehouseCapacities()
  ]);
}

// Chart computed properties
const isMovementEmpty = computed(() => {
  if (movementData.value.length === 0) return true;
  return movementData.value.every(
    item => (item.inboundQuantity || 0) === 0 && (item.outboundQuantity || 0) === 0
  );
});

const movementChartSeries = computed(() => {
  return [
    {
      name: t('sidebar.menu.stockIn'),
      data: movementData.value.map(item => item.inboundQuantity || 0)
    },
    {
      name: t('sidebar.menu.stockOut'),
      data: movementData.value.map(item => item.outboundQuantity || 0)
    }
  ];
});

const movementChartOptions = computed(() => {
  const dates = movementData.value.map(item => {
    if (!item.date) return "";
    const parts = item.date.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return item.date;
  });
  
  return {
    chart: {
      type: "area",
      fontFamily: "inherit",
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    stroke: { curve: "smooth", width: 2 },
    dataLabels: { enabled: false },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.15,
        opacityTo: 0.02,
        stops: [0, 90, 100]
      }
    },
    grid: {
      borderColor: "var(--color-border)",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    xaxis: {
      categories: dates,
      labels: {
        style: { colors: "var(--color-text-secondary)", fontSize: "11px" },
        rotate: 0,
        hideOverlappingLabels: true,
        formatter: function(val, timestamp, opts) {
          if (!opts || typeof opts.index !== 'number') return val;
          const idx = opts.index;
          const totalPoints = dates.length;
          if (totalPoints > 20) {
            const step = Math.floor(totalPoints / 6);
            if (idx === 0 || idx === totalPoints - 1 || idx % step === 0) {
              return val;
            }
            return "";
          }
          return val;
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: "var(--color-text-secondary)", fontSize: "11px" },
        formatter: (val) => formatNumber(val)
      }
    },
    colors: ["#2563EB", "#1E40AF"],
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
      fontFamily: "inherit",
      markers: { radius: 12 },
      labels: { colors: "var(--color-text-primary)" }
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: layoutStore.theme === 'dark' ? 'dark' : 'light',
      x: {
        show: true,
        formatter: function(val, opts) {
          if (opts && typeof opts.dataPointIndex === 'number') {
            const item = movementData.value[opts.dataPointIndex];
            if (item && item.date) {
              const parts = item.date.split('-');
              if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
              }
              return item.date;
            }
          }
          return val;
        }
      },
      y: {
        formatter: (val) => `${formatNumber(val)} sản phẩm`
      }
    }
  };
});

const stockHealthTotal = computed(() => {
  if (!stockHealthData.value) return 0;
  const healthy = stockHealthData.value.healthy || 0;
  const lowStock = stockHealthData.value.lowStock || 0;
  const outOfStock = stockHealthData.value.outOfStock || 0;
  return healthy + lowStock + outOfStock;
});

const stockHealthSeries = computed(() => {
  if (!stockHealthData.value) return [0, 0, 0];
  return [
    stockHealthData.value.healthy || 0,
    stockHealthData.value.lowStock || 0,
    stockHealthData.value.outOfStock || 0
  ];
});

const stockHealthOptions = computed(() => {
  return {
    chart: {
      type: "donut",
      fontFamily: "inherit"
    },
    labels: ["Còn hàng", "Sắp hết", "Hết hàng"],
    colors: ["#16825D", "#D97706", "#DC2626"],
    stroke: { show: true, colors: [layoutStore.theme === 'dark' ? '#151D30' : '#FFF'], width: 2 },
    dataLabels: { enabled: false },
    legend: {
      show: false
    },
    tooltip: {
      theme: layoutStore.theme === 'dark' ? 'dark' : 'light',
      y: {
        formatter: (val) => `${formatNumber(val)} vị trí`
      }
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "11px",
              fontFamily: "inherit",
              color: "var(--color-text-secondary)",
              offsetY: -4
            },
            value: {
              show: true,
              fontSize: "20px",
              fontWeight: "700",
              fontFamily: "inherit",
              color: "var(--color-text-primary)",
              offsetY: 6,
              formatter: (val) => formatNumber(val)
            },
            total: {
              show: true,
              label: "Vị trí tồn kho",
              color: "var(--color-text-secondary)",
              fontFamily: "inherit",
              formatter: () => formatNumber(stockHealthTotal.value)
            }
          }
        }
      }
    }
  };
});

function formatPercent(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

const warehouseDistSeries = computed(() => {
  return [
    {
      name: "Tổng lượng tồn",
      data: warehouseDistData.value.map(item => item.totalQuantity || 0)
    }
  ];
});

const warehouseDistOptions = computed(() => {
  const names = warehouseDistData.value.map(item => item.warehouseName || "");
  return {
    chart: {
      type: "bar",
      fontFamily: "inherit",
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "55%",
        borderRadius: 4,
        dataLabels: { position: "right" }
      }
    },
    colors: ["#2563EB"],
    stroke: { show: false },
    dataLabels: {
      enabled: true,
      textAnchor: "start",
      style: {
        colors: [layoutStore.theme === 'dark' ? '#FFFFFF' : '#17201E'],
        fontSize: "11px",
        fontWeight: "bold",
        fontFamily: "inherit"
      },
      formatter: (val) => formatNumber(val),
      offsetX: 6
    },
    grid: {
      borderColor: "var(--color-border)",
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } }
    },
    xaxis: {
      categories: names,
      labels: {
        style: { colors: "var(--color-text-secondary)", fontSize: "11px" },
        formatter: (val) => formatNumber(val)
      }
    },
    yaxis: {
      labels: {
        style: { colors: "var(--color-text-secondary)", fontSize: "11px" },
        maxWidth: 160
      }
    },
    tooltip: {
      theme: layoutStore.theme === 'dark' ? 'dark' : 'light',
      x: { show: true },
      y: {
        formatter: (val) => `${formatNumber(val)} sản phẩm`
      }
    }
  };
});
</script>

<template>
  <div class="page-container page-shell">
    
    <!-- Header Greeting Area -->
    <div class="dashboard-header animate-in fade-in duration-200">
      <div class="greeting-section">
        <h1 class="page-title text-zinc-900 dark:text-zinc-100">
          {{ $t('dashboard.greeting') }}, <span class="text-blue-600 font-bold">{{ currentUserName || 'Thiên Lộc' }}</span>
        </h1>
        <p class="page-desc text-zinc-500 dark:text-zinc-400">{{ $t('dashboard.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm flex items-center gap-1" @click="retryDashboardLoad" :disabled="isLoading">
          <i class="mdi mdi-refresh text-blue-600" :class="{ 'mdi-spin': isLoading }"></i>
          {{ $t('common.refresh') }}
        </button>
      </div>
    </div>

    <!-- Error state banner -->
    <div v-if="dashboardAlertMessage" class="error-alert animate-in fade-in duration-200">
      <div class="flex items-center gap-2">
        <i class="mdi mdi-alert-circle text-lg"></i>
        <span>{{ dashboardAlertMessage }}</span>
      </div>
    </div>

    <!-- KPI Strip (Designed summary strip) -->
    <div class="kpi-strip card animate-in fade-in duration-200" v-if="hasDashboardData || isLoading">
      <template v-if="isLoading">
        <div v-for="index in 4" :key="index" class="kpi-metric-item">
          <div class="skeleton skeleton-label"></div>
          <div class="skeleton skeleton-value mt-2"></div>
        </div>
      </template>
      <template v-else>
        <!-- Item 1: Products count -->
        <div v-if="canSeeProducts" class="kpi-metric-item" @click="openRoute('/products')" role="button" tabindex="0">
          <span class="kpi-meta-label">{{ $t('dashboard.totalProducts') }}</span>
          <div class="kpi-val-row">
            <span class="kpi-value font-semibold">{{ productCountFailed ? "—" : formatNumber(summary.products) }}</span>
            <i class="mdi mdi-package-variant-closed kpi-icon"></i>
          </div>
        </div>
        <div class="kpi-divider" v-if="canSeeProducts && canSeeWarehouses"></div>
        
        <!-- Item 2: Warehouses count -->
        <div v-if="canSeeWarehouses" class="kpi-metric-item" @click="openRoute('/warehouses')" role="button" tabindex="0">
          <span class="kpi-meta-label">{{ $t('dashboard.totalWarehouses') }}</span>
          <div class="kpi-val-row">
            <span class="kpi-value font-semibold">{{ warehouseCountFailed ? "—" : formatNumber(summary.warehouses) }}</span>
            <i class="mdi mdi-warehouse kpi-icon"></i>
          </div>
        </div>
        <div class="kpi-divider" v-if="canSeeWarehouses && canSeeWarnings"></div>

        <!-- Item 3: Total stock -->
        <div v-if="canSeeWarnings" class="kpi-metric-item" @click="openRoute('/inventory')" role="button" tabindex="0">
          <span class="kpi-meta-label">{{ $t('dashboard.totalAvailableStock') }}</span>
          <div class="kpi-val-row">
            <span class="kpi-value font-semibold">{{ stockTotalFailed ? "—" : formatNumber(summary.stock) }}</span>
            <i class="mdi mdi-cube-outline kpi-icon"></i>
          </div>
        </div>
        <div class="kpi-divider" v-if="canSeeWarnings"></div>

        <!-- Item 4: Alerts warnings count -->
        <div v-if="canSeeWarnings" class="kpi-metric-item" @click="openRoute('/alerts')" role="button" tabindex="0">
          <span class="kpi-meta-label">{{ $t('dashboard.inventoryAlerts') }}</span>
          <div class="kpi-val-row">
            <span class="kpi-value font-semibold" :class="{ 'text-red-600 font-bold': summary.warnings > 0 }">
              {{ warningCountFailed ? "—" : formatNumber(summary.warnings) }}
            </span>
            <i class="mdi mdi-alert-circle-outline kpi-icon" :class="{ 'text-red-600': summary.warnings > 0 }"></i>
          </div>
        </div>
      </template>
    </div>

    <!-- Asymmetrical Composition Grid -->
    <div class="dashboard-grid animate-in fade-in duration-200">
      
      <!-- Left Column: Primary Operational Data (~65%) -->
      <div class="dashboard-main-col">
        
        <!-- Section: Biến động nhập xuất -->
        <section class="card card-pad">
          <div class="section-head-wrap mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="section-title text-zinc-900 dark:text-zinc-100">{{ $t('dashboard.stockMovement') }}</h2>
              <p class="eyebrow text-zinc-500 dark:text-zinc-400">{{ $t('dashboard.stockMovementDesc') }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select 
                v-model="movementWarehouseId" 
                class="select select-sm w-36" 
                @change="fetchMovementData" 
                :disabled="isMovementLoading"
              >
                <option value="">{{ $t('dashboard.allWarehouses') }}</option>
                <option v-for="w in warehouseList" :key="w.id" :value="w.id">
                  {{ w.maKho || w.code ? `${w.maKho || w.code} - ${w.tenKho || w.name || '-'}` : (w.tenKho || w.name || '-') }}
                </option>
              </select>
              <div class="btn-group flex gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <button 
                  v-for="days in [7, 30, 90]" 
                  :key="days"
                  class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all select-none"
                  :class="selectedDaysRange === days ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'"
                  type="button"
                  @click="changeDaysRange(days)"
                  :disabled="isMovementLoading"
                >
                  {{ days }} ngày
                </button>
              </div>
              <div ref="datepickerContainer" class="date-navigation flex items-center gap-1.5">
                <button 
                  class="btn btn-secondary btn-icon btn-sm" 
                  type="button"
                  @click="previous90Days" 
                  :disabled="isMovementLoading"
                  :title="selectedDaysRange + ' ngày trước'"
                >
                  <i class="mdi mdi-chevron-left text-base"></i>
                </button>
                
                <div class="relative">
                  <button 
                    class="btn btn-secondary btn-sm flex items-center gap-2 cursor-pointer select-none whitespace-nowrap" 
                    type="button"
                    @click.stop="toggleCalendar" 
                    :disabled="isMovementLoading"
                  >
                    <i class="mdi mdi-calendar text-blue-600 text-base"></i>
                    <span>{{ formatLocalDateDisplay(movementStartDate) }}</span>
                    <span class="text-zinc-400">→</span>
                    <span class="text-zinc-500 font-medium">{{ formatLocalDateDisplay(movementEndDate) }}</span>
                  </button>
                  
                  <!-- Calendar Popup -->
                  <div v-if="isCalendarOpen" class="calendar-popup animate-in fade-in duration-150">
                    <!-- Calendar Header -->
                    <div class="calendar-header">
                      <button class="btn btn-ghost btn-icon btn-sm" type="button" @click="prevMonth">
                        <i class="mdi mdi-chevron-left"></i>
                      </button>
                      <span class="calendar-header-title">{{ calendarTitle }}</span>
                      <button class="btn btn-ghost btn-icon btn-sm" type="button" @click="nextMonth">
                        <i class="mdi mdi-chevron-right"></i>
                      </button>
                    </div>
                    
                    <!-- Weekday Labels -->
                    <div class="calendar-weekdays">
                      <span v-for="day in calendarWeekdays" :key="day">{{ day }}</span>
                    </div>
                    
                    <!-- Days Grid -->
                    <div class="calendar-days-grid">
                      <button 
                        v-for="day in calendarDays" 
                        :key="day.id"
                        class="calendar-day-btn"
                        :class="getDayClass(day)"
                        type="button"
                        @click="selectTempDate(day.date)"
                      >
                        {{ day.dayNumber }}
                      </button>
                    </div>
                    
                    <!-- Calendar Footer Actions -->
                    <div class="calendar-footer">
                      <button class="btn btn-ghost btn-sm text-zinc-500 font-medium" type="button" @click="closeCalendar">
                        {{ $t('common.cancel') }}
                      </button>
                      <button class="btn btn-primary btn-sm font-semibold" type="button" @click="applyCalendar">
                        {{ $t('common.apply') }}
                      </button>
                    </div>
                  </div>
                </div>
                
                <button 
                  class="btn btn-secondary btn-icon btn-sm" 
                  type="button"
                  @click="next90Days" 
                  :disabled="isMovementLoading"
                  :title="selectedDaysRange + ' ngày tiếp theo'"
                >
                  <i class="mdi mdi-chevron-right text-base"></i>
                </button>
              </div>
            </div>
          </div>

          <div v-if="isMovementLoading" class="loading-state-mini">
            <i class="mdi mdi-loading mdi-spin text-xl text-blue-600"></i>
            <span>{{ $t('dashboard.loadingChart') }}</span>
          </div>

          <div v-else-if="movementFailed" class="analytical-placeholder-error py-8 text-center">
            <i class="mdi mdi-alert-circle-outline text-3xl text-red-500 mb-2"></i>
            <h3 class="font-semibold text-zinc-800 dark:text-zinc-200 text-sm mb-1">{{ $t('dashboard.failedLoadMovement') }}</h3>
            <button class="btn btn-secondary btn-sm mt-2" @click="fetchMovementData">{{ $t('common.refresh') }}</button>
          </div>

          <div v-else-if="movementData.length === 0" class="analytical-placeholder">
            <div class="placeholder-icon-wrap">
              <i class="mdi mdi-chart-areaspline text-3xl text-zinc-400 dark:text-zinc-500"></i>
            </div>
            <h3 class="font-semibold text-zinc-800 dark:text-zinc-200 text-sm mb-1">{{ $t('dashboard.noMovementData') }}</h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-md text-center">
              {{ $t('dashboard.noMovementDataDesc') }}
            </p>
          </div>

          <div v-else-if="isMovementEmpty" class="relative">
            <div class="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-4">
              <i class="mdi mdi-alert-circle-outline text-2xl text-zinc-400 dark:text-zinc-500 mb-1"></i>
              <p class="text-xs text-zinc-600 dark:text-zinc-300 font-medium">{{ $t('dashboard.noMovementInPeriod') }}</p>
            </div>
            <ApexCharts type="area" :options="movementChartOptions" :series="movementChartSeries" height="280" />
          </div>

          <div v-else>
            <ApexCharts type="area" :options="movementChartOptions" :series="movementChartSeries" height="280" />
          </div>
        </section>

        <!-- Section: Nhật ký hoạt động kho gần đây (Real Table) -->
        <section class="card card-pad">
          <div class="section-head between mb-4">
            <div>
              <h2 class="section-title text-zinc-900 dark:text-zinc-100">{{ $t('dashboard.recentActivityLog') }}</h2>
              <p class="eyebrow text-zinc-500 dark:text-zinc-400">{{ $t('dashboard.recentActivityLogDesc') }}</p>
            </div>
            <button class="btn btn-secondary btn-sm flex items-center gap-1" @click="openRoute('/inventory-transactions')">
              {{ $t('common.viewAll') }} <i class="mdi mdi-arrow-right"></i>
            </button>
          </div>

          <div v-if="isLoading" class="loading-state-mini">
            <i class="mdi mdi-loading mdi-spin text-xl text-blue-600"></i>
            <span>{{ $t('dashboard.loadingTransactions') }}</span>
          </div>
          
          <div v-else-if="recentTransactionsFailed" class="state-card state-card--error">
            <div class="state-card__icon"><i class="mdi mdi-alert-circle-outline"></i></div>
            <div class="state-card__body">
              <h3>{{ $t('dashboard.errorLoadingData') }}</h3>
              <p>{{ $t('dashboard.errorLoadingTransactionsDesc') }}</p>
            </div>
          </div>

          <div v-else-if="recentTransactions.length === 0" class="state-card state-card--empty">
            <div class="state-card__icon"><i class="mdi mdi-clipboard-text-outline"></i></div>
            <div class="state-card__body">
              <h3>{{ $t('dashboard.noActivityRecorded') }}</h3>
              <p>{{ $t('dashboard.noActivityRecordedDesc') }}</p>
            </div>
          </div>

          <div v-else class="table-wrap no-border">
            <table class="compact-activity-table">
              <thead>
                <tr>
                  <th style="width: 140px;">{{ $t('dashboard.tableHeaderTime') }}</th>
                  <th style="width: 130px;">{{ $t('dashboard.tableHeaderType') }}</th>
                  <th>{{ $t('dashboard.tableHeaderProduct') }}</th>
                  <th class="text-right" style="width: 100px;">{{ $t('dashboard.tableHeaderChange') }}</th>
                  <th>{{ $t('dashboard.tableHeaderNote') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in recentTransactions" :key="t.id">
                  <td class="text-xs tabular-num text-zinc-500 dark:text-zinc-400">{{ formatDate(t.createdAt) }}</td>
                  <td><StatusBadge :status="$t(getTransactionTypeLabel(t.transactionType))" /></td>
                  <td>
                    <div class="prod-info-mini">
                      <span class="font-semibold text-zinc-900 dark:text-zinc-100 block">{{ t.productName }}</span>
                      <code class="sku-mini block w-fit mt-0.5 text-3xs">{{ t.productCode }}</code>
                    </div>
                  </td>
                  <td class="text-right font-semibold tabular-num" :class="Number(getDelta(t)) >= 0 ? 'text-emerald-600' : 'text-zinc-700 dark:text-zinc-300'">
                    {{ getDelta(t) }}
                  </td>
                  <td class="text-xs">
                    <span v-if="t.importReceiptId" class="doc-link" @click="viewDocumentDetail('in', t.importReceiptId)">
                      <i class="mdi mdi-receipt-text-outline text-xs"></i> {{ $t('dashboard.importReceiptShort') }} #{{ t.importReceiptId }}
                    </span>
                    <span v-else-if="t.exportReceiptId" class="doc-link" @click="viewDocumentDetail('out', t.exportReceiptId)">
                      <i class="mdi mdi-receipt-text-send-outline text-xs"></i> {{ $t('dashboard.exportReceiptShort') }} #{{ t.exportReceiptId }}
                    </span>
                    <span v-else class="text-zinc-500 dark:text-zinc-400">{{ t.note || '—' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Secondary Analytics Row (Grid-2 on Desktop) -->
        <div class="secondary-analytics-row">
          
          <!-- Section: Stock Health -->
          <section class="card card-pad">
            <div class="section-head mb-4">
              <h2 class="section-title text-zinc-900 dark:text-zinc-100">{{ $t('dashboard.stockHealth') }}</h2>
              <p class="eyebrow text-zinc-500 dark:text-zinc-400">{{ $t('dashboard.stockHealthDesc') }}</p>
            </div>

            <div v-if="isStockHealthLoading" class="loading-state-mini">
              <i class="mdi mdi-loading mdi-spin text-xl text-blue-600"></i>
              <span>{{ $t('dashboard.loadingStockHealth') }}</span>
            </div>

            <div v-else-if="stockHealthFailed" class="analytical-placeholder-error py-6 text-center">
              <i class="mdi mdi-alert-circle-outline text-2xl text-red-500 mb-2"></i>
              <p class="text-xs text-zinc-700 dark:text-zinc-300 font-semibold mb-2">{{ $t('dashboard.failedLoadStockHealth') }}</p>
              <button class="btn btn-secondary btn-sm" @click="fetchStockHealth">{{ $t('common.retry') }}</button>
            </div>

            <div v-else-if="!stockHealthData || stockHealthTotal === 0" class="analytical-placeholder-mini">
              <i class="mdi mdi-chart-donut text-2xl text-zinc-400 dark:text-zinc-500 mb-2"></i>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 text-center px-4">{{ $t('dashboard.noStockHealthData') }}</p>
            </div>

            <div v-else>
              <div class="flex justify-center py-2">
                <ApexCharts type="donut" :options="stockHealthOptions" :series="stockHealthSeries" width="260" height="180" />
              </div>
              
              <!-- Custom Legend & Counts display -->
              <div class="stock-health-legend mt-2 border-t border-zinc-100 dark:border-zinc-800 pt-2">
                <div class="legend-item flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div class="flex items-center gap-1.5">
                    <span class="legend-dot" style="background-color: #16825D;"></span>
                    <span class="text-xs text-zinc-700 dark:text-zinc-300">{{ $t('dashboard.statusInStock') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold tabular-num text-zinc-900 dark:text-zinc-100">{{ formatNumber(stockHealthData.healthy) }}</span>
                    <span class="text-3xs text-zinc-400 dark:text-zinc-500">({{ formatPercent(stockHealthData.healthy, stockHealthTotal) }})</span>
                  </div>
                </div>
                <div class="legend-item flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div class="flex items-center gap-1.5">
                    <span class="legend-dot" style="background-color: #D97706;"></span>
                    <span class="text-xs text-zinc-700 dark:text-zinc-300">{{ $t('dashboard.statusLowStock') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold tabular-num text-zinc-900 dark:text-zinc-100">{{ formatNumber(stockHealthData.lowStock) }}</span>
                    <span class="text-3xs text-zinc-400 dark:text-zinc-500">({{ formatPercent(stockHealthData.lowStock, stockHealthTotal) }})</span>
                  </div>
                </div>
                <div class="legend-item flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div class="flex items-center gap-1.5">
                    <span class="legend-dot" style="background-color: #DC2626;"></span>
                    <span class="text-xs text-zinc-700 dark:text-zinc-300">{{ $t('dashboard.statusOutOfStock') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold tabular-num text-zinc-900 dark:text-zinc-100">{{ formatNumber(stockHealthData.outOfStock) }}</span>
                    <span class="text-3xs text-zinc-400 dark:text-zinc-500">({{ formatPercent(stockHealthData.outOfStock, stockHealthTotal) }})</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Section: Warehouse Distribution -->
          <section class="card card-pad">
            <div class="section-head mb-4">
              <h2 class="section-title text-zinc-900 dark:text-zinc-100">{{ $t('dashboard.warehouseDistribution') }}</h2>
              <p class="eyebrow text-zinc-500 dark:text-zinc-400">{{ $t('dashboard.warehouseDistributionDesc') }}</p>
            </div>

            <div v-if="isWarehouseDistLoading" class="loading-state-mini">
              <i class="mdi mdi-loading mdi-spin text-xl text-blue-600"></i>
              <span>{{ $t('dashboard.loadingWarehouseDistribution') }}</span>
            </div>

            <div v-else-if="warehouseDistFailed" class="analytical-placeholder-error py-6 text-center">
              <i class="mdi mdi-alert-circle-outline text-2xl text-red-500 mb-2"></i>
              <p class="text-xs text-zinc-700 dark:text-zinc-300 font-semibold mb-2">{{ $t('dashboard.failedLoadWarehouseDistribution') }}</p>
              <button class="btn btn-secondary btn-sm" @click="fetchWarehouseDistribution">{{ $t('common.retry') }}</button>
            </div>

            <div v-else-if="warehouseDistData.length === 0" class="analytical-placeholder-mini">
              <i class="mdi mdi-chart-bar-horizontal text-2xl text-zinc-400 dark:text-zinc-500 mb-2"></i>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 text-center px-4">{{ $t('dashboard.noWarehouseDistributionData') }}</p>
            </div>

            <div v-else>
              <div class="relative">
                <ApexCharts type="bar" :options="warehouseDistOptions" :series="warehouseDistSeries" height="180" />
              </div>
              <div v-if="warehouseDistData.length > 5" class="mt-2 text-right">
                <span class="text-3xs text-zinc-400 dark:text-zinc-500">{{ $t('dashboard.showingAllWarehousesCount', { count: warehouseDistData.length }) }}</span>
              </div>
            </div>
          </section>

          <!-- Section: Warehouse Capacity -->
          <section class="card card-pad">
            <div class="section-head mb-4 flex items-center justify-between">
              <div>
                <h2 class="section-title text-zinc-900 dark:text-zinc-100">{{ $t('dashboard.warehouseCapacity') || 'Dung tích kho hàng' }}</h2>
                <p class="eyebrow text-zinc-500 dark:text-zinc-400">{{ $t('dashboard.warehouseCapacityDesc') || 'Tình trạng lấp đầy thể tích thực tế của các kho' }}</p>
              </div>
              <button class="btn btn-ghost btn-sm" @click="fetchWarehouseCapacities" :disabled="isLoadingCapacities">
                <i class="mdi mdi-refresh"></i>
              </button>
            </div>

            <div v-if="isLoadingCapacities" class="loading-state-mini py-6 text-center">
              <i class="mdi mdi-loading mdi-spin text-xl text-blue-600"></i>
            </div>

            <div v-else-if="warehouseCapacities.length === 0" class="py-6 text-center text-zinc-400 text-sm">
              — {{ $t('dashboard.noWarehouseCapacityData') || 'Chưa cấu hình dung tích kho' }} —
            </div>

            <div v-else class="space-y-4">
              <div v-for="w in warehouseCapacities" :key="w.id" class="space-y-1.5">
                <div class="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <span class="truncate max-w-xs">{{ w.code }} - {{ w.name }}</span>
                  <span :class="w.usagePercentage > 100 ? 'text-red-600 font-bold' : w.usagePercentage >= 95 ? 'text-amber-600 font-bold' : 'text-zinc-600 dark:text-zinc-400'">
                    {{ w.usagePercentage.toFixed(0) }}% sử dụng
                  </span>
                </div>
                
                <div class="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all duration-500" 
                    :class="w.usagePercentage > 100 ? 'bg-red-700' : w.usagePercentage >= 95 ? 'bg-amber-500' : w.usagePercentage >= 80 ? 'bg-amber-400' : 'bg-green-500'"
                    :style="{ width: Math.min(w.usagePercentage, 100) + '%' }"
                  ></div>
                </div>
                <div class="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>{{ w.usedVolume.toFixed(2) }} / {{ w.maxVolume.toFixed(2) }} m³</span>
                  <span v-if="w.maxVolume > 0 && w.maxVolume - w.usedVolume > 0">Còn trống: {{ (w.maxVolume - w.usedVolume).toFixed(2) }} m³</span>
                  <span v-else-if="w.maxVolume > 0" class="text-red-500 font-medium">Quá tải</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- Right Column: Insights, Actions & Action Queue (~35%) -->
      <div class="dashboard-side-col">
        
        <!-- StockSense Insight (Visually Memorably Styled) -->
        <section class="insight-panel card animate-in fade-in duration-200" v-if="canSeeWarnings && !isLoading">
          <div class="insight-header">
            <i class="mdi mdi-lightbulb-on-outline text-amber-500"></i>
            <h3 class="text-zinc-900 dark:text-zinc-100">{{ $t('dashboard.insightsTitle') }}</h3>
          </div>
          <div class="insight-body-new">
            <div class="insight-message" v-if="summary.warnings > 0">
              <span class="bullet-dot warning-dot animate-pulse"></span>
              <p class="text-zinc-700 dark:text-zinc-300 text-xs" v-html="$t('dashboard.insightLowStockAlert', { count: summary.warnings })"></p>
            </div>
            <div class="insight-message" v-else>
              <span class="bullet-dot success-dot"></span>
              <p class="text-zinc-700 dark:text-zinc-300 text-xs">{{ $t('dashboard.insightAllStockSafe') }}</p>
            </div>

            <div class="insight-message mt-2.5" v-if="pendingApprovalsTotal > 0">
              <span class="bullet-dot info-dot"></span>
              <p class="text-zinc-700 dark:text-zinc-300 text-xs" v-html="$t('dashboard.insightPendingApprovals', { count: pendingApprovalsTotal })"></p>
            </div>

            <button class="btn btn-sm btn-ghost mt-3 w-full justify-center text-blue-600" @click="openRoute('/alerts')">
              {{ $t('dashboard.viewAlertDetails') }} <i class="mdi mdi-arrow-right"></i>
            </button>
          </div>
        </section>

        <!-- Dynamic AI Forecast Surfacing Preview Panel -->
        <section class="card card-pad ai-forecast-preview animate-in fade-in duration-200">
          <div class="section-head mb-3">
            <div class="flex items-center gap-1.5">
              <i class="mdi mdi-robot-outline text-blue-600 text-lg"></i>
              <h2 class="section-title text-zinc-900 dark:text-zinc-100">AI Forecast Preview</h2>
            </div>
            <p class="eyebrow text-zinc-500 dark:text-zinc-400">{{ $t('dashboard.aiForecastDesc') }}</p>
          </div>

          <div class="forecast-preview-placeholder">
            <i class="mdi mdi-trending-up text-xl text-blue-600 mb-1"></i>
            <p class="text-xs text-zinc-800 dark:text-zinc-200 font-semibold mb-1">{{ $t('dashboard.aiForecastReportTitle') }}</p>
            <p class="text-3xs text-zinc-500 dark:text-zinc-400 text-center px-2">{{ $t('dashboard.aiForecastReportDesc') }}</p>
            <button class="btn btn-secondary btn-sm w-full mt-3 justify-center gap-1" @click="openRoute('/forecast')">
              <i class="mdi mdi-chart-timeline-variant"></i> {{ $t('dashboard.goToAiForecast') }}
            </button>
          </div>
        </section>

        <!-- Unified "Cần chú ý" Queue -->
        <section class="card card-pad attention-panel">
          <div class="section-head mb-3">
            <h2 class="section-title text-zinc-900 dark:text-zinc-100">{{ $t('dashboard.workQueue') }}</h2>
            <p class="eyebrow text-zinc-500 dark:text-zinc-400">{{ $t('dashboard.workQueueDesc') }}</p>
          </div>

          <div v-if="isLoading" class="loading-state-mini">
            <i class="mdi mdi-loading mdi-spin text-lg text-blue-600"></i>
            <span>{{ $t('dashboard.loadingWork') }}</span>
          </div>
          
          <div v-else-if="!pendingImportItems.length && !pendingExportItems.length && !lowStockItems.length" class="state-card state-card--empty">
            <div class="state-card__icon">
              <i class="mdi mdi-check-circle-outline"></i>
            </div>
            <div class="state-card__body">
              <h3>{{ $t('dashboard.noPendingTasks') }}</h3>
              <p>{{ $t('dashboard.noPendingTasksDesc') }}</p>
            </div>
          </div>

          <div v-else class="attention-list">
            <!-- Low stock alerts -->
            <div 
              v-for="item in lowStockItems" 
              :key="`low-${item.id}`" 
              class="attention-item"
              @click="openRoute('/alerts')"
              role="button"
              tabindex="0"
            >
              <div class="attention-item__main">
                <span 
                  class="badge-tag"
                  :class="item.severity === 'CRITICAL' ? 'badge-tag--danger' : 'badge-tag--warning'"
                >
                  {{ item.severity === 'CRITICAL' ? $t('dashboard.statusOutOfStock') : $t('dashboard.alertBadge') }}
                </span>
                <strong>{{ item.productName }}</strong>
                <p>{{ item.warehouseName }} · {{ $t('dashboard.stockLabel') }}: {{ item.available }} / {{ $t('dashboard.minStockLabel') }} {{ item.minStock }}</p>
              </div>
              <i class="mdi mdi-chevron-right"></i>
            </div>

            <!-- Pending imports -->
            <div 
              v-for="item in pendingImportItems" 
              :key="`import-${item.id}`" 
              class="attention-item"
              @click="openRoute(item.route)"
              role="button"
              tabindex="0"
            >
              <div class="attention-item__main">
                <span class="badge-tag badge-tag--warning">{{ $t('dashboard.pendingImportBadge') }}</span>
                <strong>{{ item.code }}</strong>
                <p>{{ item.label }} · {{ item.subtitle }}</p>
              </div>
              <i class="mdi mdi-chevron-right"></i>
            </div>

            <!-- Pending exports -->
            <div 
              v-for="item in pendingExportItems" 
              :key="`export-${item.id}`" 
              class="attention-item"
              @click="openRoute(item.route)"
              role="button"
              tabindex="0"
            >
              <div class="attention-item__main">
                <span class="badge-tag badge-tag--warning">{{ $t('dashboard.pendingExportBadge') }}</span>
                <strong>{{ item.code }}</strong>
                <p>{{ item.label }} · {{ item.subtitle }}</p>
              </div>
              <i class="mdi mdi-chevron-right"></i>
            </div>
          </div>
        </section>

        <!-- Quick Access links by role -->
        <section class="card card-pad">
          <div class="section-head mb-3">
            <h2 class="section-title text-zinc-900 dark:text-zinc-100">{{ $t('dashboard.quickShortcuts') }}</h2>
            <p class="eyebrow text-zinc-500 dark:text-zinc-400">{{ $t('dashboard.quickShortcutsDesc') }}</p>
          </div>
          
          <div class="quick-actions-grid" v-if="visibleQuickActions.length > 0">
            <button
              v-for="act in visibleQuickActions"
              :key="act.title"
              class="btn btn-secondary btn-sm quick-action-btn flex items-center justify-start gap-2"
              @click="openRoute(act.route)"
            >
              <i class="mdi text-blue-600 text-lg" :class="act.icon"></i>
              <span>{{ act.title }}</span>
            </button>
          </div>
          <div v-else class="text-xs text-zinc-500 dark:text-zinc-400 py-2">
            {{ $t('dashboard.noQuickShortcuts') }}
          </div>
        </section>

        <!-- Need Inventory Reorder (Low stock details list) -->
        <section class="card card-pad" v-if="canSeeWarnings && !isLoading && lowStockItems.length > 0">
          <div class="section-head mb-3">
            <h2 class="section-title text-zinc-900 dark:text-zinc-100">{{ $t('dashboard.itemsToReorder') }}</h2>
            <p class="eyebrow text-zinc-500 dark:text-zinc-400">{{ $t('dashboard.itemsToReorderDesc') }}</p>
          </div>

          <div class="reorder-list">
            <div v-for="(item, idx) in lowStockItems" :key="`reorder-${item.id}`" class="reorder-item">
              <span class="reorder-rank">{{ String(idx + 1).padStart(2, '0') }}</span>
              <div class="reorder-details">
                <span class="font-semibold text-zinc-900 dark:text-zinc-100 text-xs block truncate" style="max-width: 140px;" :title="item.productName">{{ item.productName }}</span>
                <span class="text-3xs text-zinc-500 dark:text-zinc-400 block truncate" style="max-width: 140px;">{{ item.warehouseName }}</span>
              </div>
              <div class="reorder-qty-stats text-right ml-auto">
                <span class="text-xs font-semibold block text-zinc-800 dark:text-zinc-200 tabular-num">{{ item.available }} / {{ item.minStock }}</span>
                <span class="text-3xs text-red-600 font-semibold block tabular-num">{{ $t('dashboard.missingQty', { count: item.minStock - item.available }) }}</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.greeting-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0;
}

.page-desc {
  font-size: 14px;
  margin: 0;
}

.error-alert {
  background: var(--color-danger-soft);
  border: 1px solid rgba(220, 38, 38, 0.2);
  color: var(--color-danger);
  padding: 14px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 13px;
  font-weight: 500;
}

/* KPI Strip Panel */
.kpi-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  margin-bottom: 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.kpi-metric-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 160ms ease, border-radius 160ms ease;
  min-width: 0;
}

.kpi-metric-item[role="button"]:hover {
  background-color: var(--color-bg);
  border-radius: 8px;
}

.kpi-meta-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-val-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.kpi-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.kpi-icon {
  font-size: 22px;
  color: var(--color-text-muted);
}

.kpi-divider {
  width: 1px;
  height: 40px;
  background-color: var(--color-border);
  flex-shrink: 0;
}

/* Asymmetric Grid Layout */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1.85fr 1fr;
  gap: 24px;
  align-items: start;
}

.dashboard-main-col,
.dashboard-side-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Section Head Formatting */
.section-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-head.between {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0;
}

.eyebrow {
  font-size: 12px;
  font-weight: 500;
  margin: 0;
}

/* Analytical Placeholder Component */
.analytical-placeholder {
  min-height: 220px;
  border: 1px dashed var(--color-border-strong);
  background-color: var(--color-bg);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.placeholder-icon-wrap {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  display: grid;
  place-items: center;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.codex-badge {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 4px 10px;
  border-radius: 6px;
}

/* Mini Placeholder for Smaller Sections */
.analytical-placeholder-mini {
  min-height: 120px;
  border: 1px dashed var(--color-border-strong);
  background-color: var(--color-bg);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

/* Compact Activity Table */
.compact-activity-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.compact-activity-table th {
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  font-weight: 700;
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
}

.compact-activity-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.compact-activity-table tr:hover td {
  background-color: var(--color-action-primary-soft);
}

.prod-info-mini {
  display: flex;
  flex-direction: column;
}

.sku-mini {
  font-family: monospace;
  padding: 1px 4px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 3px;
}

.doc-link {
  color: var(--color-action-primary);
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.doc-link:hover {
  text-decoration: underline;
  color: var(--color-action-primary-hover);
}

/* Secondary Row */
.secondary-analytics-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* Insight Panel Styling */
.insight-panel {
  background-color: var(--color-action-primary-soft);
  border: 1px solid var(--color-action-primary-border);
  border-radius: 12px;
  padding: 18px 20px;
}

.insight-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.insight-header i {
  font-size: 20px;
}

.insight-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.insight-body-new {
  display: flex;
  flex-direction: column;
}

.insight-message {
  display: flex;
  align-items: center;
  gap: 10px;
}

.insight-message p {
  margin: 0;
}

.bullet-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.warning-dot {
  background-color: var(--color-warning);
}

.success-dot {
  background-color: var(--color-success);
}

.info-dot {
  background-color: var(--color-info);
}

/* AI Forecast Preview Panel */
.ai-forecast-preview {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.forecast-preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--color-bg);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.text-2xs {
  font-size: 10px;
}

/* Work Queue Lists */
.attention-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attention-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  cursor: pointer;
  transition: border-color 150ms ease, background-color 150ms ease;
}

.attention-item:hover {
  border-color: var(--color-primary);
  background-color: var(--color-action-primary-soft);
}

.attention-item__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.badge-tag {
  display: inline-flex;
  align-self: flex-start;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.badge-tag--danger {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.badge-tag--warning {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.attention-item__main strong {
  font-size: 13px;
  color: var(--color-text-primary);
}

.attention-item__main p {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.attention-item i {
  font-size: 18px;
  color: var(--color-text-muted);
}

/* Quick Actions Grid */
.quick-actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.quick-action-btn {
  width: 100%;
  height: 42px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  font-weight: 600;
  color: var(--color-text-primary);
  transition: border-color 150ms ease, background-color 150ms ease;
}

.quick-action-btn:hover {
  border-color: var(--color-primary);
  background-color: var(--color-action-primary-soft);
}

/* Reorder List */
.reorder-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reorder-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  background-color: var(--color-bg);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.reorder-rank {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  font-family: monospace;
}

.reorder-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.reorder-qty-stats {
  margin-left: auto;
}

.text-3xs {
  font-size: 10px;
}

/* Skeletons */
.skeleton {
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-bg) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
  border-radius: 4px;
}

.skeleton-label {
  width: 80px;
  height: 14px;
}

.skeleton-value {
  width: 60px;
  height: 24px;
}

.loading-state-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Responsive Media Queries */
@media (max-width: 1279px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1023px) {
  .kpi-strip {
    flex-wrap: wrap;
    gap: 16px;
    padding: 16px;
  }
  .kpi-metric-item {
    flex: 1 1 40%;
    padding: 6px 12px;
  }
  .kpi-divider {
    display: none;
  }
  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .compact-activity-table {
    min-width: 720px;
  }
}

@media (max-width: 768px) {
  .secondary-analytics-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (max-width: 639px) {
  .page-container {
    padding: 16px;
  }
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .header-actions {
    width: 100%;
  }
  .header-actions .btn {
    width: 100%;
    justify-content: center;
  }
  .kpi-metric-item {
    flex: 1 1 100%;
  }
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.select-sm {
  min-height: 32px;
  height: 32px;
  padding: 4px 8px;
  font-size: 13px;
  border-radius: 6px;
}
.tabs-sm {
  padding: 2px;
  border-radius: 6px;
}
.tab-sm {
  padding: 4px 10px;
  font-size: 13px;
  border-radius: 4px;
}
.analytical-placeholder-error {
  min-height: 120px;
  border: 1px dashed var(--color-danger);
  background-color: var(--color-danger-soft);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

/* Custom Calendar Styles */
.date-navigation {
  display: inline-flex;
  align-items: center;
}

.calendar-popup {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 8px;
  width: 280px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.calendar-header-title {
  font-weight: 700;
  font-size: 13.5px;
  color: var(--color-text-primary);
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.calendar-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day-btn {
  height: 30px;
  width: 30px;
  margin: 0 auto;
  border: 0;
  background: transparent;
  border-radius: 9999px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
  font-weight: 500;
  cursor: pointer;
}

.calendar-day-btn.selected {
  background: var(--color-action-primary);
  color: #ffffff !important;
  font-weight: 700;
}

.calendar-day-btn.today {
  border: 1px solid var(--color-action-primary);
  color: var(--color-action-primary);
}

.calendar-day-btn.current-month {
  color: var(--color-text-primary);
}

.calendar-day-btn.other-month {
  color: var(--color-text-muted);
}

.calendar-day-btn.current-month:hover {
  background: var(--color-btn-hover-bg);
}

.calendar-day-btn.other-month:hover {
  background: var(--color-btn-hover-bg);
}

.calendar-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}
</style>
