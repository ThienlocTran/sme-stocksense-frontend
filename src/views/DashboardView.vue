<script setup>
import { computed, onMounted, ref, reactive } from "vue";
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
import { getWarehouses } from "../services/warehouseService";
import {
  getDashboardOverview,
  getInventoryMovement,
  getStockHealth,
  getWarehouseDistribution
} from "../services/dashboardService";
import { useAuthStore } from "../stores/auth";
import ApexCharts from "vue3-apexcharts";

defineOptions({
  components: { ApexCharts },
});

const router = useRouter();
const authStore = useAuthStore();

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
const selectedPeriodDays = ref(30);

const periodPresets = [
  { label: "7 ngày", days: 7 },
  { label: "30 ngày", days: 30 },
  { label: "90 ngày", days: 90 },
];

const currentUser = computed(() => authStore.currentUser);
const currentUserName = computed(() => currentUser.value?.hoTen || currentUser.value?.fullName || "");

const canSeeImportApprovals = computed(() => canAccessRoute("/approvals"));
const canSeeExportApprovals = computed(() =>
  canAccessRoute("/pending-export-approvals"),
);
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
    actions.push({ title: "Tạo phiếu nhập", icon: "mdi-tray-arrow-down", route: "/stock-in/create" });
    actions.push({ title: "Tạo phiếu xuất", icon: "mdi-tray-arrow-up", route: "/stock-out/create" });
    actions.push({ title: "Duyệt phiếu nhập", icon: "mdi-check-decagram-outline", route: "/approvals" });
    actions.push({ title: "Duyệt phiếu xuất", icon: "mdi-file-clock-outline", route: "/pending-export-approvals" });
    actions.push({ title: "Import Excel", icon: "mdi-file-excel-outline", route: "/import-excel" });
  } else if (role === "MANAGER") {
    actions.push({ title: "Duyệt phiếu nhập", icon: "mdi-check-decagram-outline", route: "/approvals" });
    actions.push({ title: "Duyệt phiếu xuất", icon: "mdi-file-clock-outline", route: "/pending-export-approvals" });
    actions.push({ title: "Phiếu nhập kho", icon: "mdi-tray-arrow-down", route: "/stock-in" });
    actions.push({ title: "Phiếu xuất kho", icon: "mdi-tray-arrow-up", route: "/stock-out" });
    actions.push({ title: "Import Excel", icon: "mdi-file-excel-outline", route: "/import-excel" });
  } else if (role === "EMPLOYEE") {
    actions.push({ title: "Tạo phiếu nhập", icon: "mdi-tray-arrow-down", route: "/stock-in/create" });
    actions.push({ title: "Tạo phiếu xuất", icon: "mdi-tray-arrow-up", route: "/stock-out/create" });
    actions.push({ title: "Phiếu nhập của tôi", icon: "mdi-tray-arrow-down", route: "/stock-in" });
    actions.push({ title: "Phiếu xuất của tôi", icon: "mdi-tray-arrow-up", route: "/stock-out" });
    actions.push({ title: "Import Excel", icon: "mdi-file-excel-outline", route: "/import-excel" });
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
            route: "/pending-export-approvals",
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
    { value: "NHAP_KHO", label: "Nhập kho" },
    { value: "XUAT_KHO", label: "Xuất kho" },
    { value: "NHAP_DAU_KY", label: "Nhập đầu kỳ" },
    { value: "DIEU_CHINH_TANG", label: "Điều chỉnh tăng" },
    { value: "DIEU_CHINH_GIAM", label: "Điều chỉnh giảm" },
  ];
  return transactionTypeOptions.find((option) => option.value === type)?.label || "Không xác định";
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

// Local Vietnam-timezone-safe date calculations
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRangeDates(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return {
    from: getLocalDateString(from),
    to: getLocalDateString(to)
  };
}

function changePeriod(days) {
  selectedPeriodDays.value = days;
  fetchMovementData();
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
  
  const { from, to } = getRangeDates(selectedPeriodDays.value);
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

function loadAnalyticsData() {
  loadWarehouseDropdown().then(() => {
    fetchMovementData();
  });
  
  Promise.allSettled([
    fetchStockHealth(),
    fetchWarehouseDistribution()
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
      name: "Nhập kho",
      data: movementData.value.map(item => item.inboundQuantity || 0)
    },
    {
      name: "Xuất kho",
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
        hideOverlappingLabels: true
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
      theme: "light",
      x: { show: true },
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
    stroke: { show: true, colors: ["#FFF"], width: 2 },
    dataLabels: { enabled: false },
    legend: {
      show: false
    },
    tooltip: {
      theme: "light",
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
        colors: ["#17201E"],
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
      theme: "light",
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
        <h1 class="page-title text-zinc-900">
          Chào buổi sáng, <span class="text-blue-600 font-bold">{{ currentUserName || 'Thiên Lộc' }}</span>
        </h1>
        <p class="page-desc text-zinc-500">Đây là tình trạng kho hàng của bạn hôm nay.</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm flex items-center gap-1" @click="retryDashboardLoad" :disabled="isLoading">
          <i class="mdi mdi-refresh text-blue-600" :class="{ 'mdi-spin': isLoading }"></i>
          Làm mới
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
          <span class="kpi-meta-label">Tổng sản phẩm</span>
          <div class="kpi-val-row">
            <span class="kpi-value font-semibold">{{ productCountFailed ? "—" : formatNumber(summary.products) }}</span>
            <i class="mdi mdi-package-variant-closed kpi-icon"></i>
          </div>
        </div>
        <div class="kpi-divider" v-if="canSeeProducts && canSeeWarehouses"></div>
        
        <!-- Item 2: Warehouses count -->
        <div v-if="canSeeWarehouses" class="kpi-metric-item" @click="openRoute('/warehouses')" role="button" tabindex="0">
          <span class="kpi-meta-label">Tổng kho hàng</span>
          <div class="kpi-val-row">
            <span class="kpi-value font-semibold">{{ warehouseCountFailed ? "—" : formatNumber(summary.warehouses) }}</span>
            <i class="mdi mdi-warehouse kpi-icon"></i>
          </div>
        </div>
        <div class="kpi-divider" v-if="canSeeWarehouses && canSeeWarnings"></div>

        <!-- Item 3: Total stock -->
        <div v-if="canSeeWarnings" class="kpi-metric-item" @click="openRoute('/inventory')" role="button" tabindex="0">
          <span class="kpi-meta-label">Tổng tồn khả dụng</span>
          <div class="kpi-val-row">
            <span class="kpi-value font-semibold">{{ stockTotalFailed ? "—" : formatNumber(summary.stock) }}</span>
            <i class="mdi mdi-cube-outline kpi-icon"></i>
          </div>
        </div>
        <div class="kpi-divider" v-if="canSeeWarnings"></div>

        <!-- Item 4: Alerts warnings count -->
        <div v-if="canSeeWarnings" class="kpi-metric-item" @click="openRoute('/alerts')" role="button" tabindex="0">
          <span class="kpi-meta-label">Cảnh báo tồn kho</span>
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
              <h2 class="section-title text-zinc-900">Biến động Nhập / Xuất kho</h2>
              <p class="eyebrow text-zinc-500">Xu hướng dòng chảy hàng hóa qua các kho</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select 
                v-model="movementWarehouseId" 
                class="select select-sm w-36" 
                @change="fetchMovementData" 
                :disabled="isMovementLoading"
              >
                <option value="">Tất cả kho</option>
                <option v-for="w in warehouseList" :key="w.id" :value="w.id">
                  {{ w.maKho || w.code ? `${w.maKho || w.code} - ${w.tenKho || w.name || '-'}` : (w.tenKho || w.name || '-') }}
                </option>
              </select>
              <div class="tabs tabs-sm">
                <button 
                  v-for="p in periodPresets" 
                  :key="p.days" 
                  class="tab tab-sm" 
                  :class="{ active: selectedPeriodDays === p.days }"
                  @click="changePeriod(p.days)"
                  :disabled="isMovementLoading"
                >
                  {{ p.label }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="isMovementLoading" class="loading-state-mini">
            <i class="mdi mdi-loading mdi-spin text-xl text-blue-600"></i>
            <span>Đang tải biểu đồ biến động...</span>
          </div>

          <div v-else-if="movementFailed" class="analytical-placeholder-error py-8 text-center">
            <i class="mdi mdi-alert-circle-outline text-3xl text-red-500 mb-2"></i>
            <h3 class="font-semibold text-zinc-800 text-sm mb-1">Không thể tải dữ liệu biến động kho</h3>
            <button class="btn btn-secondary btn-sm mt-2" @click="fetchMovementData">Thử lại</button>
          </div>

          <div v-else-if="movementData.length === 0" class="analytical-placeholder">
            <div class="placeholder-icon-wrap">
              <i class="mdi mdi-chart-areaspline text-3xl text-zinc-400"></i>
            </div>
            <h3 class="font-semibold text-zinc-800 text-sm mb-1">Chưa có dữ liệu biến động</h3>
            <p class="text-xs text-zinc-500 max-w-md text-center">
              Không tìm thấy hoạt động nhập xuất nào trong khoảng thời gian đã chọn.
            </p>
          </div>

          <div v-else-if="isMovementEmpty" class="relative">
            <div class="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-4">
              <i class="mdi mdi-alert-circle-outline text-2xl text-zinc-400 mb-1"></i>
              <p class="text-xs text-zinc-600 font-medium">Không có biến động nhập/xuất trong khoảng thời gian này.</p>
            </div>
            <ApexCharts type="area" :options="movementChartOptions" :series="movementChartSeries" height="280" />
          </div>

          <div v-else>
            <ApexCharts type="area" :options="movementChartOptions" :series="movementChartSeries" height="280" />
          </div>
        </section>

        <!-- Section: Nhật ký hoạt động gần đây (Real Table) -->
        <section class="card card-pad">
          <div class="section-head between mb-4">
            <div>
              <h2 class="section-title text-zinc-900">Nhật ký hoạt động kho gần đây</h2>
              <p class="eyebrow text-zinc-500">5 giao dịch phát sinh mới nhất được ghi nhận</p>
            </div>
            <button class="btn btn-secondary btn-sm flex items-center gap-1" @click="openRoute('/inventory-transactions')">
              Xem tất cả <i class="mdi mdi-arrow-right"></i>
            </button>
          </div>

          <div v-if="isLoading" class="loading-state-mini">
            <i class="mdi mdi-loading mdi-spin text-xl text-blue-600"></i>
            <span>Đang tải nhật ký giao dịch...</span>
          </div>
          
          <div v-else-if="recentTransactionsFailed" class="state-card state-card--error">
            <div class="state-card__icon"><i class="mdi mdi-alert-circle-outline"></i></div>
            <div class="state-card__body">
              <h3>Lỗi tải dữ liệu</h3>
              <p>Không thể tải nhật ký hoạt động gần đây từ hệ thống.</p>
            </div>
          </div>

          <div v-else-if="recentTransactions.length === 0" class="state-card state-card--empty">
            <div class="state-card__icon"><i class="mdi mdi-clipboard-text-outline"></i></div>
            <div class="state-card__body">
              <h3>Chưa ghi nhận hoạt động</h3>
              <p>Không tìm thấy hoạt động kho nào phát sinh trong ngày hôm nay.</p>
            </div>
          </div>

          <div v-else class="table-wrap no-border">
            <table class="compact-activity-table">
              <thead>
                <tr>
                  <th style="width: 140px;">Thời gian</th>
                  <th style="width: 130px;">Loại giao dịch</th>
                  <th>Sản phẩm</th>
                  <th class="text-right" style="width: 100px;">Biến động</th>
                  <th>Chứng từ / Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in recentTransactions" :key="t.id">
                  <td class="text-xs tabular-num text-zinc-500">{{ formatDate(t.createdAt) }}</td>
                  <td><StatusBadge :status="getTransactionTypeLabel(t.transactionType)" /></td>
                  <td>
                    <div class="prod-info-mini">
                      <span class="font-semibold text-zinc-900 block">{{ t.productName }}</span>
                      <code class="sku-mini block w-fit mt-0.5 text-3xs">{{ t.productCode }}</code>
                    </div>
                  </td>
                  <td class="text-right font-semibold tabular-num" :class="Number(getDelta(t)) >= 0 ? 'text-emerald-600' : 'text-zinc-700'">
                    {{ getDelta(t) }}
                  </td>
                  <td class="text-xs">
                    <span v-if="t.importReceiptId" class="doc-link" @click="viewDocumentDetail('in', t.importReceiptId)">
                      <i class="mdi mdi-receipt-text-outline text-xs"></i> Phiếu nhập #{{ t.importReceiptId }}
                    </span>
                    <span v-else-if="t.exportReceiptId" class="doc-link" @click="viewDocumentDetail('out', t.exportReceiptId)">
                      <i class="mdi mdi-receipt-text-send-outline text-xs"></i> Phiếu xuất #{{ t.exportReceiptId }}
                    </span>
                    <span v-else class="text-zinc-500">{{ t.note || '—' }}</span>
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
              <h2 class="section-title text-zinc-900">Sức khỏe tồn kho</h2>
              <p class="eyebrow text-zinc-500">Mật độ vị trí tồn khỏe so với cảnh báo</p>
            </div>

            <div v-if="isStockHealthLoading" class="loading-state-mini">
              <i class="mdi mdi-loading mdi-spin text-xl text-blue-600"></i>
              <span>Đang tải sức khỏe tồn kho...</span>
            </div>

            <div v-else-if="stockHealthFailed" class="analytical-placeholder-error py-6 text-center">
              <i class="mdi mdi-alert-circle-outline text-2xl text-red-500 mb-2"></i>
              <p class="text-xs text-zinc-700 font-semibold mb-2">Không thể tải dữ liệu tình trạng tồn kho.</p>
              <button class="btn btn-secondary btn-sm" @click="fetchStockHealth">Thử lại</button>
            </div>

            <div v-else-if="!stockHealthData || stockHealthTotal === 0" class="analytical-placeholder-mini">
              <i class="mdi mdi-chart-donut text-2xl text-zinc-400 mb-2"></i>
              <p class="text-xs text-zinc-500 text-center px-4">Chưa có dữ liệu tồn kho để phân tích.</p>
            </div>

            <div v-else>
              <div class="flex justify-center py-2">
                <ApexCharts type="donut" :options="stockHealthOptions" :series="stockHealthSeries" width="260" height="180" />
              </div>
              
              <!-- Custom Legend & Counts display -->
              <div class="stock-health-legend mt-2 border-t border-zinc-100 pt-2">
                <div class="legend-item flex items-center justify-between py-1 border-b border-zinc-100 last:border-0">
                  <div class="flex items-center gap-1.5">
                    <span class="legend-dot" style="background-color: #16825D;"></span>
                    <span class="text-xs text-zinc-700">Còn hàng</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold tabular-num text-zinc-900">{{ formatNumber(stockHealthData.healthy) }}</span>
                    <span class="text-3xs text-zinc-400">({{ formatPercent(stockHealthData.healthy, stockHealthTotal) }})</span>
                  </div>
                </div>
                <div class="legend-item flex items-center justify-between py-1 border-b border-zinc-100 last:border-0">
                  <div class="flex items-center gap-1.5">
                    <span class="legend-dot" style="background-color: #D97706;"></span>
                    <span class="text-xs text-zinc-700">Sắp hết</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold tabular-num text-zinc-900">{{ formatNumber(stockHealthData.lowStock) }}</span>
                    <span class="text-3xs text-zinc-400">({{ formatPercent(stockHealthData.lowStock, stockHealthTotal) }})</span>
                  </div>
                </div>
                <div class="legend-item flex items-center justify-between py-1 border-b border-zinc-100 last:border-0">
                  <div class="flex items-center gap-1.5">
                    <span class="legend-dot" style="background-color: #DC2626;"></span>
                    <span class="text-xs text-zinc-700">Hết hàng</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold tabular-num text-zinc-900">{{ formatNumber(stockHealthData.outOfStock) }}</span>
                    <span class="text-3xs text-zinc-400">({{ formatPercent(stockHealthData.outOfStock, stockHealthTotal) }})</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Section: Warehouse Distribution -->
          <section class="card card-pad">
            <div class="section-head mb-4">
              <h2 class="section-title text-zinc-900">Phân bổ kho hàng</h2>
              <p class="eyebrow text-zinc-500">Tỷ trọng số lượng tồn kho theo vị trí</p>
            </div>

            <div v-if="isWarehouseDistLoading" class="loading-state-mini">
              <i class="mdi mdi-loading mdi-spin text-xl text-blue-600"></i>
              <span>Đang tải phân bổ kho...</span>
            </div>

            <div v-else-if="warehouseDistFailed" class="analytical-placeholder-error py-6 text-center">
              <i class="mdi mdi-alert-circle-outline text-2xl text-red-500 mb-2"></i>
              <p class="text-xs text-zinc-700 font-semibold mb-2">Không thể tải dữ liệu phân bổ kho hàng.</p>
              <button class="btn btn-secondary btn-sm" @click="fetchWarehouseDistribution">Thử lại</button>
            </div>

            <div v-else-if="warehouseDistData.length === 0" class="analytical-placeholder-mini">
              <i class="mdi mdi-chart-bar-horizontal text-2xl text-zinc-400 mb-2"></i>
              <p class="text-xs text-zinc-500 text-center px-4">Chưa có dữ liệu tồn kho theo kho hàng.</p>
            </div>

            <div v-else>
              <div class="relative">
                <ApexCharts type="bar" :options="warehouseDistOptions" :series="warehouseDistSeries" height="180" />
              </div>
              <div v-if="warehouseDistData.length > 5" class="mt-2 text-right">
                <span class="text-3xs text-zinc-400">Hiển thị tất cả {{ warehouseDistData.length }} kho hàng</span>
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
            <h3 class="text-zinc-900">StockSense Insight</h3>
          </div>
          <div class="insight-body-new">
            <div class="insight-message" v-if="summary.warnings > 0">
              <span class="bullet-dot warning-dot animate-pulse"></span>
              <p class="text-zinc-700 text-xs">Có <strong>{{ summary.warnings }} mặt hàng</strong> đang dưới mức tồn tối thiểu an toàn.</p>
            </div>
            <div class="insight-message" v-else>
              <span class="bullet-dot success-dot"></span>
              <p class="text-zinc-700 text-xs">Tất cả các mặt hàng hiện đều ở mức tồn an toàn.</p>
            </div>

            <div class="insight-message mt-2.5" v-if="pendingApprovalsTotal > 0">
              <span class="bullet-dot info-dot"></span>
              <p class="text-zinc-700 text-xs">Có <strong>{{ pendingApprovalsTotal }} chứng từ</strong> đang ở hàng đợi phê duyệt.</p>
            </div>

            <button class="btn btn-sm btn-ghost mt-3 w-full justify-center text-blue-600" @click="openRoute('/alerts')">
              Xem chi tiết cảnh báo <i class="mdi mdi-arrow-right"></i>
            </button>
          </div>
        </section>

        <!-- Dynamic AI Forecast Surfacing Preview Panel -->
        <section class="card card-pad ai-forecast-preview animate-in fade-in duration-200">
          <div class="section-head mb-3">
            <div class="flex items-center gap-1.5">
              <i class="mdi mdi-robot-outline text-blue-600 text-lg"></i>
              <h2 class="section-title text-zinc-900">AI Forecast Preview</h2>
            </div>
            <p class="eyebrow text-zinc-500">Dự báo nhu cầu 30 ngày tới</p>
          </div>

          <div class="forecast-preview-placeholder">
            <i class="mdi mdi-trending-up text-xl text-blue-600 mb-1"></i>
            <p class="text-xs text-zinc-800 font-semibold mb-1">Báo cáo & Phân tích dự báo AI</p>
            <p class="text-3xs text-zinc-500 text-center px-2">Truy cập Phân hệ Dự báo AI để xem chi tiết sai số sMAPE và lượng hàng khuyến nghị nhập dựa trên dữ liệu bán hàng lịch sử.</p>
            <button class="btn btn-secondary btn-sm w-full mt-3 justify-center gap-1" @click="openRoute('/forecast')">
              <i class="mdi mdi-chart-timeline-variant"></i> Vào module Dự báo AI
            </button>
          </div>
        </section>

        <!-- Unified "Cần chú ý" Queue -->
        <section class="card card-pad attention-panel">
          <div class="section-head mb-3">
            <h2 class="section-title text-zinc-900">Hàng đợi công việc</h2>
            <p class="eyebrow text-zinc-500">Các tác vụ cần ưu tiên giải quyết</p>
          </div>

          <div v-if="isLoading" class="loading-state-mini">
            <i class="mdi mdi-loading mdi-spin text-lg text-blue-600"></i>
            <span>Đang tải công việc...</span>
          </div>
          
          <div v-else-if="!pendingImportItems.length && !pendingExportItems.length && !lowStockItems.length" class="state-card state-card--empty">
            <div class="state-card__icon">
              <i class="mdi mdi-check-circle-outline"></i>
            </div>
            <div class="state-card__body">
              <h3>Không có nhiệm vụ tồn đọng</h3>
              <p>Mọi phiếu duyệt và mức tồn kho hiện tại đều ổn định.</p>
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
                  {{ item.severity === 'CRITICAL' ? 'Hết hàng' : 'Cảnh báo' }}
                </span>
                <strong>{{ item.productName }}</strong>
                <p>{{ item.warehouseName }} · Tồn: {{ item.available }} / tối thiểu {{ item.minStock }}</p>
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
                <span class="badge-tag badge-tag--warning">Nhập chờ duyệt</span>
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
                <span class="badge-tag badge-tag--warning">Xuất chờ duyệt</span>
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
            <h2 class="section-title text-zinc-900">Lối tắt tác vụ nhanh</h2>
            <p class="eyebrow text-zinc-500">Tác vụ theo quyền hạn vai trò</p>
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
          <div v-else class="text-xs text-zinc-500 py-2">
            Không có lối tắt phù hợp với quyền hạn của bạn.
          </div>
        </section>

        <!-- Need Inventory Reorder (Low stock details list) -->
        <section class="card card-pad" v-if="canSeeWarnings && !isLoading && lowStockItems.length > 0">
          <div class="section-head mb-3">
            <h2 class="section-title text-zinc-900">Mặt hàng cần nhập</h2>
            <p class="eyebrow text-zinc-500">Ưu tiên theo số lượng thiếu hụt lớn nhất</p>
          </div>

          <div class="reorder-list">
            <div v-for="(item, idx) in lowStockItems" :key="`reorder-${item.id}`" class="reorder-item">
              <span class="reorder-rank">{{ String(idx + 1).padStart(2, '0') }}</span>
              <div class="reorder-details">
                <span class="font-semibold text-zinc-900 text-xs block truncate" style="max-width: 140px;" :title="item.productName">{{ item.productName }}</span>
                <span class="text-3xs text-zinc-500 block truncate" style="max-width: 140px;">{{ item.warehouseName }}</span>
              </div>
              <div class="reorder-qty-stats text-right ml-auto">
                <span class="text-xs font-semibold block text-zinc-800 tabular-num">{{ item.available }} / {{ item.minStock }}</span>
                <span class="text-3xs text-red-600 font-semibold block tabular-num">Thiếu {{ item.minStock - item.available }}</span>
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
</style>
