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
import { canAccessRoute } from "../services/permissionService";
import { getWarehouses } from "../services/warehouseService";
import { getDashboardOverview } from "../services/dashboardService";
import { useAuthStore } from "../stores/auth";

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
  const actions = [
    { title: "Tạo phiếu nhập", icon: "mdi-tray-arrow-down", route: "/stock-in/create" },
    { title: "Tạo phiếu xuất", icon: "mdi-tray-arrow-up", route: "/stock-out/create" },
    { title: "Kiểm kê kho", icon: "mdi-clipboard-check-outline", route: "/inventory-counts" },
    { title: "Import Excel", icon: "mdi-file-excel-outline", route: "/import-excel" }
  ];
  return actions.filter(act => canAccessRoute(act.route));
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
      ? data.content.map((item) => ({
          id: item.inventoryId || item.productId,
          productCode: item.productCode || "SP",
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
        
        <!-- Section: Biến động nhập xuất (Placeholder Chart) -->
        <section class="card card-pad">
          <div class="section-head mb-4">
            <h2 class="section-title text-zinc-900">Biến động Nhập / Xuất kho</h2>
            <p class="eyebrow text-zinc-500">Xu hướng nhịp độ 30 ngày qua</p>
          </div>
          
          <!-- Analytical Placeholder State -->
          <div class="analytical-placeholder">
            <div class="placeholder-icon-wrap">
              <i class="mdi mdi-chart-areaspline text-3xl text-zinc-400"></i>
            </div>
            <h3 class="font-semibold text-zinc-800 text-sm mb-1">Chưa đủ dữ liệu hiển thị biểu đồ biến động</h3>
            <p class="text-xs text-zinc-500 max-w-md text-center">
              Biểu đồ dòng chảy thời gian thực yêu cầu tổng hợp dữ liệu biến động hàng ngày từ backend. Tính năng này sẽ được kích hoạt sau khi Codex triển khai endpoint tổng hợp.
            </p>
            <div class="codex-badge mt-3">
              <code class="text-xs font-mono text-zinc-600">GET /api/dashboard/inventory-movement</code>
            </div>
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
          
          <!-- Section: Stock Health (Placeholder) -->
          <section class="card card-pad">
            <div class="section-head mb-4">
              <h2 class="section-title text-zinc-900">Sức khỏe tồn kho</h2>
              <p class="eyebrow text-zinc-500">Mật độ SKU khỏe so với tồn cảnh báo</p>
            </div>
            <div class="analytical-placeholder-mini">
              <i class="mdi mdi-chart-donut text-2xl text-zinc-400 mb-2"></i>
              <p class="text-xs text-zinc-500 text-center px-4">Yêu cầu Codex triển khai endpoint `/api/dashboard/stock-health` để hiển thị tỷ lệ SKU Khỏe / Sắp hết / Hết hàng.</p>
            </div>
          </section>

          <!-- Section: Warehouse Distribution (Placeholder) -->
          <section class="card card-pad">
            <div class="section-head mb-4">
              <h2 class="section-title text-zinc-900">Phân bổ kho hàng</h2>
              <p class="eyebrow text-zinc-500">Tỷ trọng số lượng hàng theo vị trí</p>
            </div>
            <div class="analytical-placeholder-mini">
              <i class="mdi mdi-chart-bar-horizontal text-2xl text-zinc-400 mb-2"></i>
              <p class="text-xs text-zinc-500 text-center px-4">Yêu cầu Codex triển khai endpoint `/api/dashboard/warehouse-distribution` để hiển thị tỷ trọng tổng tồn kho.</p>
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
                <span class="badge-tag badge-tag--danger">Tồn kho thấp</span>
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
  .table-wrap {
    overflow-x: auto;
  }
  .compact-activity-table {
    min-width: 500px;
  }
}
</style>
