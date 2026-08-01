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

const chartOptions = computed(() => ({
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
  colors: ["#3b82f6", "#f59e0b", "#ef4444"],
  tooltip: {
    y: {
      formatter: (value) => new Intl.NumberFormat("vi-VN").format(value),
    },
  },
}));

const canSeeImportApprovals = computed(() => canAccessRoute("/approvals"));
const canSeeExportApprovals = computed(() =>
  canAccessRoute("/pending-export-approvals"),
);
const canSeeWarnings = computed(() => canAccessRoute("/inventory"));
const canSeeAlerts = computed(() => canAccessRoute("/alerts"));
const canSeeProducts = computed(() => canAccessRoute("/products"));
const canSeeWarehouses = computed(() => canAccessRoute("/warehouses"));

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
const visibleKpiCardCount = computed(() => (canSeeWarnings.value ? 4 : 2));
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
    const requests = [loadDashboardOverview()];
    let productsResult = { status: "fulfilled", value: 0 };
    let warehouseResult = { status: "fulfilled", value: 0 };

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
      if (overviewResultValue.reason?.status === 401) {
        isLoading.value = false;
        isRetrying.value = false;
        router.replace("/login");
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
      if (productsResult.reason?.status === 401) {
        isLoading.value = false;
        isRetrying.value = false;
        router.replace("/login");
        return;
      }
    }

    if (warehouseResult.status === "fulfilled") {
      warehouseData = warehouseResult.value;
      warehouseCountFailed.value = false;
    } else {
      warehouseCountFailed.value = true;
      if (warehouseResult.reason?.status === 401) {
        isLoading.value = false;
        isRetrying.value = false;
        router.replace("/login");
        return;
      }
    }

    if (canSeeWarnings.value) {
      try {
        stockTotal = await loadStockTotal();
        stockTotalFailed.value = false;
      } catch (error) {
        if (error?.status === 401) {
          isLoading.value = false;
          isRetrying.value = false;
          router.replace("/login");
          return;
        }

        stockTotal = null;
        stockTotalFailed.value = true;
      }

      try {
        warningCount = await loadLowStockCount();
      } catch (error) {
        if (error?.status === 401) {
          isLoading.value = false;
          isRetrying.value = false;
          router.replace("/login");
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
    if (error?.status === 401) {
      isLoading.value = false;
      isRetrying.value = false;
      router.replace("/login");
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
    if (error?.status === 401) {
      isLoading.value = false;
      isRetrying.value = false;
      router.replace("/login");
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
    description="Tóm tắt hoạt động kho hàng và các việc cần xử lý."
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

  <div class="dashboard-grid">
    <section class="card card-pad dashboard-panel dashboard-panel--wide">
      <div class="section-head section-head--split">
        <div>
          <p class="eyebrow">KPI</p>
          <h2 class="section-title">Tổng quan vận hành</h2>
          <p class="section-help">
            Theo dõi số liệu chính và xu hướng làm việc trong một góc nhìn dễ
            đọc.
          </p>
        </div>
        <div class="section-head__meta">
          <span class="pill">{{
            isLoading ? "Đang tải..." : "Cập nhật gần đây"
          }}</span>
        </div>
      </div>

      <div class="kpi-summary">
        <div class="kpi-summary__item">
          <span class="kpi-summary__label">Phân nhóm</span>
          <strong>{{
            canSeeWarnings ? "Vận hành & cảnh báo" : "Vận hành"
          }}</strong>
        </div>
        <div class="kpi-summary__item">
          <span class="kpi-summary__label">Truy cập nhanh</span>
          <strong>{{ visibleQuickAccess.length }} mục</strong>
        </div>
      </div>

      <div
        v-if="isLoading"
        class="kpi-grid"
        :class="{ 'kpi-grid--two-columns': !canSeeWarnings }"
      >
        <article
          v-for="index in visibleKpiCardCount"
          :key="index"
          class="kpi-card kpi-card--loading"
        >
          <div class="kpi-card__icon"></div>
          <div class="kpi-card__body">
            <div class="kpi-label skeleton"></div>
            <div class="metric skeleton"></div>
          </div>
        </article>
      </div>

      <template v-else>
        <div
          v-if="errorMessage && !hasDashboardData"
          class="state-card state-card--error"
        >
          <div class="state-card__icon">
            <i class="mdi mdi-alert-circle-outline"></i>
          </div>
          <div class="state-card__body">
            <h3>Không thể tải dữ liệu tổng quan</h3>
            <p>Vui lòng thử lại sau hoặc kiểm tra kết nối backend.</p>
          </div>
          <button
            class="retry-button retry-button--inline"
            type="button"
            :disabled="isLoading"
            @click="retryDashboardLoad"
          >
            Thử lại
          </button>
        </div>

        <div v-else-if="!hasDashboardData" class="state-card state-card--empty">
          <div class="state-card__icon">
            <i class="mdi mdi-view-dashboard-outline"></i>
          </div>
          <div class="state-card__body">
            <h3>Chưa có dữ liệu tổng quan</h3>
            <p>Hệ thống chưa có sản phẩm, kho hoặc tồn kho để hiển thị.</p>
          </div>
        </div>

        <div
          v-else
          class="kpi-grid"
          :class="{ 'kpi-grid--two-columns': !canSeeWarnings }"
        >
          <article class="kpi-card">
            <div class="kpi-card__icon">
              <i class="mdi mdi-package-variant-closed"></i>
            </div>
            <div>
              <p class="kpi-label">Tổng sản phẩm</p>
              <div v-if="productCountFailed" class="metric">Không thể tải</div>
              <div v-else class="metric">
                {{ formatNumber(summary.products) }}
              </div>
            </div>
          </article>

          <article class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--accent">
              <i class="mdi mdi-warehouse"></i>
            </div>
            <div>
              <p class="kpi-label">Tổng kho</p>
              <div v-if="warehouseCountFailed" class="metric">
                Không thể tải
              </div>
              <div v-else class="metric">
                {{ formatNumber(summary.warehouses) }}
              </div>
            </div>
          </article>

          <article v-if="canSeeWarnings" class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--warn">
              <i class="mdi mdi-cube-outline"></i>
            </div>
            <div>
              <p class="kpi-label">Tổng tồn</p>
              <div v-if="stockTotalFailed" class="metric">Không thể tải</div>
              <div v-else class="metric">{{ formatNumber(summary.stock) }}</div>
            </div>
          </article>

          <article v-if="canSeeWarnings" class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--success">
              <i class="mdi mdi-alert-circle-outline"></i>
            </div>
            <div>
              <p class="kpi-label">Tổng cảnh báo</p>
              <div v-if="warningCountFailed" class="metric">Không thể tải</div>
              <div v-else class="metric">
                {{ formatNumber(summary.warnings) }}
              </div>
            </div>
          </article>
        </div>
      </template>
    </section>

    <section class="card card-pad dashboard-panel dashboard-panel--wide">
      <div class="section-head between">
        <div>
          <p class="eyebrow">Chart</p>
          <h2 class="section-title">Tổng quan chính</h2>
        </div>
        <button class="text-link" type="button" @click="retryDashboardLoad">
          Làm mới
        </button>
      </div>

      <div v-if="isLoading" class="state-card state-card--loading">
        <div class="skeleton skeleton--line"></div>
        <div class="skeleton skeleton--line skeleton--short"></div>
      </div>
      <div
        v-else-if="dashboardOverviewFailed"
        class="state-card state-card--error"
      >
        <div class="state-card__icon">
          <i class="mdi mdi-alert-circle-outline"></i>
        </div>
        <div class="state-card__body">
          <h3>Không thể tải dữ liệu biểu đồ</h3>
          <p>Dữ liệu dashboard chưa được đồng bộ với backend.</p>
        </div>
        <button
          class="retry-button retry-button--inline"
          type="button"
          @click="retryDashboardLoad"
        >
          Thử lại
        </button>
      </div>
      <div v-else-if="dashboardOverview.value" class="dashboard-chart-card">
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
          <p>Biểu đồ sẽ hiển thị khi backend trả dữ liệu tổng quan.</p>
        </div>
      </div>
    </section>

    <div class="dashboard-section-grid">
      <section
        v-if="canSeeImportApprovals"
        class="card card-pad dashboard-panel"
      >
        <div class="section-head between">
          <div>
            <p class="eyebrow">Pending</p>
            <h2 class="section-title">Phiếu nhập chờ duyệt</h2>
          </div>
          <button class="text-link" @click="openRoute('/approvals')">
            Xem tất cả
          </button>
        </div>

        <div v-if="isLoading" class="state-card state-card--loading">
          <div class="skeleton skeleton--line"></div>
          <div class="skeleton skeleton--line skeleton--short"></div>
        </div>
        <div
          v-else-if="pendingImportFailed"
          class="state-card state-card--error"
        >
          <div class="state-card__icon">
            <i class="mdi mdi-alert-circle-outline"></i>
          </div>
          <div class="state-card__body">
            <h3>Không thể tải dữ liệu</h3>
            <p>Danh sách phiếu nhập chờ duyệt chưa cập nhật.</p>
          </div>
          <button
            class="retry-button retry-button--inline"
            type="button"
            @click="retryDashboardLoad"
          >
            Thử lại
          </button>
        </div>
        <div v-else-if="pendingImportItems.length" class="stack-list">
          <div
            v-for="item in pendingImportItems"
            :key="`${item.label}-${item.id}`"
            class="list-item"
            @click="openRoute(item.route)"
            role="button"
            tabindex="0"
            @keydown.enter.prevent="openRoute(item.route)"
            @keydown.space.prevent="openRoute(item.route)"
          >
            <div>
              <strong>{{ item.code }}</strong>
              <p>{{ item.label }} · {{ item.subtitle }}</p>
            </div>
            <span class="badge badge--warning">Chờ duyệt</span>
          </div>
        </div>
        <div v-else class="state-card state-card--empty">
          <div class="state-card__icon">
            <i class="mdi mdi-file-check-outline"></i>
          </div>
          <div class="state-card__body">
            <h3>Không có phiếu nhập chờ duyệt</h3>
            <p>Tất cả phiếu nhập cần xử lý đã được hoàn tất.</p>
          </div>
        </div>
      </section>

      <section
        v-if="canSeeExportApprovals"
        class="card card-pad dashboard-panel"
      >
        <div class="section-head between">
          <div>
            <p class="eyebrow">Pending</p>
            <h2 class="section-title">Phiếu xuất chờ duyệt</h2>
          </div>
          <button
            class="text-link"
            @click="openRoute('/pending-export-approvals')"
          >
            Xem tất cả
          </button>
        </div>

        <div v-if="isLoading" class="state-card state-card--loading">
          <div class="skeleton skeleton--line"></div>
          <div class="skeleton skeleton--line skeleton--short"></div>
        </div>
        <div
          v-else-if="pendingExportFailed"
          class="state-card state-card--error"
        >
          <div class="state-card__icon">
            <i class="mdi mdi-alert-circle-outline"></i>
          </div>
          <div class="state-card__body">
            <h3>Không thể tải dữ liệu</h3>
            <p>Danh sách phiếu xuất chờ duyệt chưa cập nhật.</p>
          </div>
          <button
            class="retry-button retry-button--inline"
            type="button"
            @click="retryDashboardLoad"
          >
            Thử lại
          </button>
        </div>
        <div v-else-if="pendingExportItems.length" class="stack-list">
          <div
            v-for="item in pendingExportItems"
            :key="`${item.label}-${item.id}`"
            class="list-item"
            @click="openRoute(item.route)"
            role="button"
            tabindex="0"
            @keydown.enter.prevent="openRoute(item.route)"
            @keydown.space.prevent="openRoute(item.route)"
          >
            <div>
              <strong>{{ item.code }}</strong>
              <p>{{ item.label }} · {{ item.subtitle }}</p>
            </div>
            <span class="badge badge--warning">Chờ duyệt</span>
          </div>
        </div>
        <div v-else class="state-card state-card--empty">
          <div class="state-card__icon">
            <i class="mdi mdi-file-export-outline"></i>
          </div>
          <div class="state-card__body">
            <h3>Không có phiếu xuất chờ duyệt</h3>
            <p>Tất cả phiếu xuất cần xử lý đã được hoàn tất.</p>
          </div>
        </div>
      </section>

      <section v-if="canSeeAlerts" class="card card-pad dashboard-panel">
        <div class="section-head between">
          <div>
            <p class="eyebrow">Alerts</p>
            <h2 class="section-title">Cảnh báo mở</h2>
          </div>
          <button class="text-link" @click="openRoute('/alerts')">
            Xem chi tiết
          </button>
        </div>

        <div v-if="isLoading" class="state-card state-card--loading">
          <div class="skeleton skeleton--line"></div>
          <div class="skeleton skeleton--line skeleton--short"></div>
        </div>
        <div v-else-if="lowStockFailed" class="state-card state-card--error">
          <div class="state-card__icon">
            <i class="mdi mdi-alert-circle-outline"></i>
          </div>
          <div class="state-card__body">
            <h3>Không thể tải dữ liệu</h3>
            <p>Danh sách cảnh báo tồn kho chưa cập nhật.</p>
          </div>
          <button
            class="retry-button retry-button--inline"
            type="button"
            @click="retryDashboardLoad"
          >
            Thử lại
          </button>
        </div>
        <div v-else-if="lowStockItems.length" class="stack-list">
          <div
            v-for="item in lowStockItems"
            :key="item.id"
            class="list-item"
            @click="openRoute('/alerts')"
            role="button"
            tabindex="0"
            @keydown.enter.prevent="openRoute('/alerts')"
            @keydown.space.prevent="openRoute('/alerts')"
          >
            <div>
              <strong>{{ item.productName }}</strong>
              <p>{{ item.warehouseName }}</p>
            </div>
            <span class="muted">{{ item.available }}/{{ item.minStock }}</span>
          </div>
        </div>
        <div v-else class="state-card state-card--empty">
          <div class="state-card__icon">
            <i class="mdi mdi-bell-outline"></i>
          </div>
          <div class="state-card__body">
            <h3>Không có cảnh báo mở</h3>
            <p>Hiện tại chưa có mặt hàng nào ở ngưỡng cảnh báo.</p>
          </div>
        </div>
      </section>

      <section class="card card-pad dashboard-panel">
        <div class="section-head between">
          <div>
            <p class="eyebrow">Quick Access</p>
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
          <div class="state-card__icon">
            <i class="mdi mdi-link-variant"></i>
          </div>
          <div class="state-card__body">
            <h3>Không có mục truy cập nhanh</h3>
            <p>Bạn không có quyền truy cập vào các mục nhanh hiện tại.</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard-grid {
  display: grid;
  gap: 16px;
}

.dashboard-panel {
  min-width: 0;
}

.dashboard-panel--wide {
  grid-column: 1 / -1;
}

.dashboard-chart-card {
  min-height: 340px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dashboard-section-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  grid-column: 1 / -1;
}

.section-head {
  margin-bottom: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-head--split {
  align-items: flex-start;
}

.section-help {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
  max-width: 58ch;
}

.section-head__meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.kpi-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.kpi-summary__item {
  flex: 1 1 180px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
}

.kpi-summary__label {
  display: block;
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kpi-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.kpi-grid--two-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.kpi-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.kpi-card__icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #dbeafe;
  color: var(--primary);
  font-size: 20px;
  flex-shrink: 0;
}

.kpi-card__icon--accent {
  background: #e0f2fe;
  color: #0369a1;
}

.kpi-card__icon--warn {
  background: #fef3c7;
  color: #92400e;
}

.kpi-card__icon--success {
  background: #dcfce7;
  color: #15803d;
}

.kpi-card--loading {
  min-height: 110px;
}

.kpi-card__body {
  flex: 1;
}

.kpi-label {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.metric {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
}

.state-card--loading {
  min-height: 112px;
}

.state-card--error {
  border-color: #fecaca;
  background: #fef2f2;
}

.state-card--empty {
  border-style: dashed;
  background: #f8fafc;
}

.state-card__icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #e2e8f0;
  color: var(--slate);
  font-size: 20px;
}

.state-card--error .state-card__icon {
  background: #fee2e2;
  color: #b91c1c;
}

.state-card__body h3 {
  margin: 0 0 4px;
  font-size: 15px;
  color: var(--text);
}

.state-card__body p {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

.dashboard-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fef2f2;
  color: #991b1b;
}

.dashboard-alert__content strong {
  display: block;
  margin-bottom: 4px;
}

.dashboard-alert__content p {
  margin: 0;
  color: #7f1d1d;
}

.retry-button {
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.retry-button:disabled {
  opacity: 0.7;
  cursor: progress;
}

.retry-button--inline {
  justify-self: start;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.badge--warning {
  background: #fef3c7;
  color: #92400e;
}

.stack-list {
  display: grid;
  gap: 10px;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.list-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.list-item strong {
  display: block;
  margin-bottom: 2px;
}

.list-item p {
  margin: 0;
  color: var(--muted);
}

.text-link {
  background: none;
  border: 0;
  padding: 0;
  color: var(--primary);
  font-weight: 700;
}

.quick-links {
  display: grid;
  gap: 10px;
}

.quick-link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  text-align: left;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.quick-link:hover {
  border-color: var(--primary);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.quick-link i {
  font-size: 20px;
  color: var(--primary);
}

.quick-link span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quick-link small {
  color: var(--muted);
}

.skeleton {
  display: block;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0 25%, #f8fafc 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.1s linear infinite;
}

.skeleton--line {
  width: 100%;
}

.skeleton--short {
  width: 60%;
}

.skeleton.metric {
  width: 72px;
  height: 24px;
  margin-top: 6px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 1023px) {
  .kpi-grid {
    grid-template-columns: 1fr 1fr;
  }

  .dashboard-section-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-alert {
    flex-direction: column;
    align-items: flex-start;
  }

  .list-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
