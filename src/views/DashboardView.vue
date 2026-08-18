<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import { getPendingExportReceipts } from "../services/exportReceiptService";
import {
  getInventory,
  getLowStockInventory,
} from "../services/inventoryService";
import { getPendingApprovals } from "../services/importReceiptService";
import { getProducts } from "../services/productService";
import { canAccessRoute } from "../services/permissionService";
import { getWarehouses } from "../services/warehouseService";
import ApexCharts from "vue3-apexcharts";
import { getDashboardOverview } from "../services/dashboardService";

defineOptions({
  components: { ApexCharts },
});

const router = useRouter();

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

const chartOptions = computed(() => {
  let primary = "#176B5B";
  let warning = "#D88A13";
  let danger = "#C2413B";
  
  if (typeof window !== "undefined") {
    const rootStyle = getComputedStyle(document.documentElement);
    primary = rootStyle.getPropertyValue('--color-primary').trim() || primary;
    warning = rootStyle.getPropertyValue('--color-warning').trim() || warning;
    danger = rootStyle.getPropertyValue('--color-danger').trim() || danger;
  }
  
  return {
    chart: {
      type: "bar",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 8,
        columnWidth: "56%",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartCategories.value,
    },
    yaxis: {
      labels: {
        formatter: (value) => new Intl.NumberFormat("vi-VN").format(value),
      },
    },
    colors: [primary, warning, danger],
    tooltip: {
      y: {
        formatter: (value) => new Intl.NumberFormat("vi-VN").format(value),
      },
    },
  };
});

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

const chartCategories = computed(() => {
  const categories = [];
  if (canSeeWarnings.value) categories.push("Tồn kho");
  if (canSeeImportApprovals.value || canSeeExportApprovals.value)
    categories.push("Phê duyệt");
  if (canSeeAlerts.value) categories.push("Cảnh báo");
  return categories;
});

const pendingApprovalsTotal = computed(() => {
  const importReceipts = canSeeImportApprovals.value
    ? Number(dashboardOverview.value?.pendingTasks?.importReceipts || 0)
    : 0;
  const exportReceipts = canSeeExportApprovals.value
    ? Number(dashboardOverview.value?.pendingTasks?.exportReceipts || 0)
    : 0;

  return importReceipts + exportReceipts;
});

const chartSeries = computed(() => [
  {
    name: "Số lượng",
    data: [
      ...(canSeeWarnings.value
        ? [Number(dashboardOverview.value?.overview?.totalStock || 0)]
        : []),
      ...(canSeeImportApprovals.value || canSeeExportApprovals.value
        ? [pendingApprovalsTotal.value]
        : []),
      ...(canSeeAlerts.value
        ? [Number(dashboardOverview.value?.pendingTasks?.inventoryAlerts || 0)]
        : []),
    ],
  },
]);
const visibleKpiCardCount = computed(() => {
  let count = 0;
  if (canSeeProducts.value) count += 1;
  if (canSeeWarehouses.value) count += 1;
  if (canSeeWarnings.value) count += 2;
  return count || 2;
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
    warningCountFailed.value
  );
});
const dashboardAlertMessage = computed(() => {
  if (errorMessage.value) {
    return errorMessage.value;
  }

  if (hasAnyApiError.value) {
    return "Một số dữ liệu trên dashboard chưa tải được. Vui lòng thử lại.";
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

  // Treat failed stock/warning loads as dashboard-visible error states so
  // the KPI cards can still render their fallback messages instead of the
  // empty-state view.
  const hasWarningLoadError =
    typeof warningCountFailed !== "undefined" &&
    warningCountFailed.value === true;
  const hasStockLoadError =
    typeof stockTotalFailed !== "undefined" && stockTotalFailed.value === true;

  return (
    hasSummaryData ||
    hasPendingApprovals ||
    hasLowStockAlerts ||
    hasPendingSectionErrors ||
    hasLowStockSectionError ||
    hasWarningLoadError ||
    hasStockLoadError ||
    productCountFailed.value ||
    warehouseCountFailed.value
  );
});

const visibleQuickAccess = computed(() => {
  const items = [
    {
      title: "Product",
      description: "Quản lý mặt hàng",
      icon: "mdi-package-variant-closed",
      route: "/products",
    },
    {
      title: "Inventory",
      description: "Xem tồn kho và biến động",
      icon: "mdi-clipboard-list-outline",
      route: "/inventory",
    },
    {
      title: "Import Receipt",
      description: "Quản lý phiếu nhập kho",
      icon: "mdi-tray-arrow-down",
      route: "/stock-in",
    },
    {
      title: "Export Receipt",
      description: "Quản lý phiếu xuất kho",
      icon: "mdi-tray-arrow-up",
      route: "/stock-out",
    },
    {
      title: "Alerts",
      description: "Cảnh báo tồn kho thấp",
      icon: "mdi-alert-circle-outline",
      route: "/alerts",
    },
  ];

  return items.filter((item) => canAccessRoute(item.route));
});

onMounted(() => {
  loadDashboardData(true);
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
  summary.value = { products: 0, warehouses: 0, stock: 0, warnings: 0 };

  try {
    const requests = [];
    let productsResult = { status: "fulfilled", value: 0 };
    let warehouseResult = { status: "fulfilled", value: 0 };

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

    productsResult = productsCountResult ?? { status: "fulfilled", value: 0 };
    warehouseResult = warehouseCountResult ?? { status: "fulfilled", value: 0 };

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

    if (canSeeWarnings.value) {
      const lowStockData = await loadLowStockItems();
      lowStockItems.value = lowStockData.items;
      lowStockFailed.value = lowStockData.failed;
    } else {
      lowStockItems.value = [];
      lowStockFailed.value = false;
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
  } finally {
    isLoading.value = false;
    isRetrying.value = false;
  }
}

async function retryDashboardLoad() {
  if (isLoading.value) {
    return;
  }

  await loadDashboardData(true);
}

async function loadProductCount() {
  const data = await getProducts({ page: 0, size: 1 });
  return Number(data?.totalElements || 0);
}

async function loadWarehouseCount() {
  const data = await getWarehouses({ page: 0, size: 1 });
  return Number(data?.totalElements || 0);
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
            code: item.code,
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
            code: item.code,
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
      ? data.content.map((item) => ({
          id: item.inventoryId || item.productId,
          productName: item.productName || "Sản phẩm",
          warehouseName: item.warehouse || item.warehouseName || "Kho",
          available: item.currentQuantity ?? 0,
          minStock: item.minStock ?? 0,
        }))
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
</script>

<template>
  <PageHeader
    title="Tổng quan"
    description="Theo dõi tình trạng tồn kho và các công việc cần xử lý."
  />

  <div v-if="dashboardAlertMessage" class="dashboard-alert">
    <div class="dashboard-alert__content">
      <strong>Không thể tải đầy đủ dữ liệu</strong>
      <p>{{ dashboardAlertMessage }}</p>
    </div>
    <button
      class="retry-button"
      type="button"
      :disabled="isLoading"
      @click="retryDashboardLoad"
    >
      {{ isLoading ? "Đang tải..." : "Thử lại" }}
    </button>
  </div>

  <div class="dashboard-wrapper">
    <!-- Row 1: KPI Row -->
    <div class="kpi-row" v-if="hasDashboardData || isLoading">
      <template v-if="isLoading">
        <article v-for="index in visibleKpiCardCount" :key="index" class="kpi-card kpi-card--loading">
          <div class="kpi-card__body">
            <div class="kpi-label skeleton"></div>
            <div class="metric skeleton"></div>
          </div>
        </article>
      </template>
      <template v-else>
        <article v-if="canSeeProducts" class="kpi-card" @click="openRoute('/products')" role="button" tabindex="0">
          <div class="kpi-card__header">
            <span class="kpi-label">Tổng sản phẩm</span>
            <i class="mdi mdi-package-variant-closed kpi-card__icon"></i>
          </div>
          <div class="metric">{{ productCountFailed ? "Không thể tải" : formatNumber(summary.products) }}</div>
        </article>

        <article v-if="canSeeWarehouses" class="kpi-card" @click="openRoute('/warehouses')" role="button" tabindex="0">
          <div class="kpi-card__header">
            <span class="kpi-label">Tổng kho hàng</span>
            <i class="mdi mdi-warehouse kpi-card__icon"></i>
          </div>
          <div class="metric">{{ warehouseCountFailed ? "Không thể tải" : formatNumber(summary.warehouses) }}</div>
        </article>

        <article v-if="canSeeWarnings" class="kpi-card" @click="openRoute('/inventory')" role="button" tabindex="0">
          <div class="kpi-card__header">
            <span class="kpi-label">Tổng tồn khả dụng</span>
            <i class="mdi mdi-cube-outline kpi-card__icon"></i>
          </div>
          <div class="metric">{{ stockTotalFailed ? "Không thể tải" : formatNumber(summary.stock) }}</div>
        </article>

        <article v-if="canSeeWarnings" class="kpi-card" @click="openRoute('/alerts')" role="button" tabindex="0">
          <div class="kpi-card__header">
            <span class="kpi-label">Cảnh báo tồn kho</span>
            <i class="mdi mdi-alert-circle-outline kpi-card__icon kpi-card__icon--danger" :class="{ 'text-red': summary.warnings > 0 }"></i>
          </div>
          <div class="metric" :class="{ 'text-red': summary.warnings > 0 }">{{ warningCountFailed ? "Không thể tải" : formatNumber(summary.warnings) }}</div>
        </article>
      </template>
    </div>

    <!-- Row 2: Grid Layout -->
    <div class="dashboard-grid">
      <!-- Main Column: Chart -->
      <div class="dashboard-main-col">
        <section class="card card-pad dashboard-panel--wide">
          <div class="section-head between">
            <div>
              <p class="eyebrow">Xu hướng</p>
              <h2 class="section-title">Tổng quan tồn kho & duyệt phiếu</h2>
            </div>
            <button class="btn btn-sm btn-secondary" type="button" @click="retryDashboardLoad" :disabled="isLoading">
              <i class="mdi mdi-refresh" :class="{ 'mdi-spin': isLoading }"></i>
              Làm mới
            </button>
          </div>

          <div v-if="isLoading" class="state-card state-card--loading">
            <div class="skeleton skeleton--line"></div>
            <div class="skeleton skeleton--line skeleton--short"></div>
          </div>
          <div v-else-if="dashboardOverviewFailed" class="state-card state-card--error">
            <div class="state-card__icon">
              <i class="mdi mdi-alert-circle-outline"></i>
            </div>
            <div class="state-card__body">
              <h3>Không thể tải biểu đồ</h3>
              <p>Vui lòng kiểm tra lại kết nối đến máy chủ.</p>
            </div>
          </div>
          <div v-else-if="dashboardOverview" class="dashboard-chart-wrapper">
            <ApexCharts
              type="bar"
              :options="chartOptions"
              :series="chartSeries"
              height="320"
            />
          </div>
          <div v-else class="state-card state-card--empty">
            <div class="state-card__icon">
              <i class="mdi mdi-chart-bar"></i>
            </div>
            <div class="state-card__body">
              <h3>Chưa có dữ liệu biểu đồ</h3>
              <p>Biểu đồ sẽ tự động hiển thị khi có dữ liệu vận hành.</p>
            </div>
          </div>
        </section>
      </div>

      <!-- Side Column: Insight, Cần chú ý, Quick links -->
      <div class="dashboard-side-col">
        <!-- StockSense Insight (Only visible if warnings/low stock exist) -->
        <section class="insight-panel card" v-if="canSeeWarnings && !isLoading && summary.warnings > 0">
          <div class="insight-header">
            <i class="mdi mdi-lightbulb-on-outline"></i>
            <h3>StockSense Insight</h3>
          </div>
          <div class="insight-body">
            <p><strong>{{ summary.warnings }}</strong> mặt hàng hiện đang dưới mức tồn tối thiểu.</p>
            <button class="btn btn-sm btn-ghost" @click="openRoute('/alerts')">Xem cảnh báo →</button>
          </div>
        </section>

        <!-- Cần chú ý (Unified list) -->
        <section class="card card-pad attention-panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Nhiệm vụ</p>
              <h2 class="section-title">Cần chú ý</h2>
            </div>
          </div>

          <div v-if="isLoading" class="state-card state-card--loading">
            <div class="skeleton skeleton--line"></div>
          </div>
          
          <div v-else-if="!pendingImportItems.length && !pendingExportItems.length && !lowStockItems.length" class="state-card state-card--empty">
            <div class="state-card__icon">
              <i class="mdi mdi-check-circle-outline"></i>
            </div>
            <div class="state-card__body">
              <h3>Mọi thứ đều ổn</h3>
              <p>Không có phiếu chờ duyệt hoặc cảnh báo tồn thấp cần xử lý.</p>
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
                <span class="badge-tag badge-tag--danger">Tồn kho thấp</span>
                <strong>{{ item.productName }}</strong>
                <p>{{ item.warehouseName }} · Tồn: {{ item.available }} (Tối thiểu: {{ item.minStock }})</p>
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

        <!-- Quick Access -->
        <section class="card card-pad quick-access-panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Lối tắt</p>
              <h2 class="section-title">Truy cập nhanh</h2>
            </div>
          </div>
          <div v-if="visibleQuickAccess.length > 0" class="quick-links">
            <button
              v-for="item in visibleQuickAccess"
              :key="item.title"
              class="quick-link"
              @click="openRoute(item.route)"
            >
              <i class="mdi" :class="item.icon"></i>
              <span>
                <strong>{{ item.title }}</strong>
                <small>{{ item.description }}</small>
              </span>
            </button>
          </div>
          <div v-else class="state-card state-card--empty">
            <div class="state-card__body">
              <p>Không có lối tắt phù hợp với vai trò của bạn.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.kpi-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 18px 20px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  cursor: pointer;
  transition: border-color 160ms ease, transform 160ms ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100px;
}

.kpi-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

.kpi-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.kpi-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.kpi-card__icon {
  font-size: 20px;
  color: var(--color-text-secondary);
}

.kpi-card__icon--danger {
  color: var(--color-danger);
}

.metric {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.text-red {
  color: var(--color-danger) !important;
}

.kpi-card--loading {
  background: var(--color-surface);
  min-height: 100px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.7fr 1fr;
  gap: 24px;
  align-items: start;
}

.dashboard-main-col, .dashboard-side-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard-chart-wrapper {
  min-height: 320px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.insight-panel {
  background: var(--color-primary-soft);
  border: 1px solid rgba(23, 107, 91, 0.2);
  border-radius: 10px;
  padding: 16px;
}

.insight-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  color: var(--color-primary);
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

.insight-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.insight-body p {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-primary);
}

.attention-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attention-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  cursor: pointer;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.attention-item:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-soft);
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
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.badge-tag--danger {
  background: #fdf2f2;
  color: var(--color-danger);
}

.badge-tag--warning {
  background: #fff9f0;
  color: var(--color-warning);
}

.attention-item__main strong {
  font-size: 14px;
  color: var(--color-text-primary);
}

.attention-item__main p {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.attention-item i {
  font-size: 20px;
  color: var(--color-text-muted);
}

.quick-links {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.quick-link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  text-align: left;
  transition: border-color 160ms ease, background-color 160ms ease;
  cursor: pointer;
}

.quick-link:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-soft);
}

.quick-link i {
  font-size: 20px;
  color: var(--color-primary);
}

.quick-link span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quick-link strong {
  font-size: 13px;
  color: var(--color-text-primary);
}

.quick-link small {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* Skeleton & Loading */
.skeleton {
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-bg) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (max-width: 1279px) {
  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1023px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .kpi-row {
    grid-template-columns: 1fr;
  }
  .insight-body {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
