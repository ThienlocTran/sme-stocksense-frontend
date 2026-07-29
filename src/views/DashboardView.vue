<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import EmptyState from "../components/EmptyState.vue";
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

const router = useRouter();

const isLoading = ref(true);
const errorMessage = ref("");
const summary = ref({ products: 0, warehouses: 0, stock: 0, warnings: 0 });
const pendingImportItems = ref([]);
const pendingImportFailed = ref(false);
const pendingExportItems = ref([]);
const pendingExportFailed = ref(false);
const lowStockItems = ref([]);
const lowStockFailed = ref(false);
const warningCountFailed = ref(false);
const stockTotalFailed = ref(false);

const canSeeImportApprovals = computed(() => canAccessRoute("/approvals"));
const canSeeExportApprovals = computed(() =>
  canAccessRoute("/pending-export-approvals"),
);
const canSeeWarnings = computed(() => canAccessRoute("/inventory"));
const canSeeAlerts = computed(() => canAccessRoute("/alerts"));
const visibleKpiCardCount = computed(() => (canSeeWarnings.value ? 4 : 2));
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
    hasWarningLoadError ||
    hasStockLoadError
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
  loadDashboardData();
});

async function loadDashboardData() {
  isLoading.value = true;
  errorMessage.value = "";
  pendingImportItems.value = [];
  pendingImportFailed.value = false;
  pendingExportItems.value = [];
  pendingExportFailed.value = false;
  lowStockItems.value = [];
  lowStockFailed.value = false;
  warningCountFailed.value = false;
  stockTotalFailed.value = false;

  try {
    const [productsResponse, warehouseData] = await Promise.all([
      loadProductCount(),
      loadWarehouseCount(),
    ]);

    let stockTotal = null;
    let warningCount = 0;

    if (canSeeWarnings.value) {
      try {
        stockTotal = await loadStockTotal();
        stockTotalFailed.value = false;
      } catch (error) {
        if (error?.status === 401) {
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
      router.replace("/login");
      return;
    }
  }

  if (canSeeImportApprovals.value || canSeeExportApprovals.value) {
    try {
      const pendingData = await loadPendingApprovals();
      pendingImportItems.value = pendingData.importItems;
      pendingImportFailed.value = pendingData.importFailed;
      pendingExportItems.value = pendingData.exportItems;
      pendingExportFailed.value = pendingData.exportFailed;
    } catch (error) {
      if (error?.status === 401) {
        router.replace("/login");
        return;
      }

      pendingImportItems.value = [];
      pendingImportFailed.value = true;
      pendingExportItems.value = [];
      pendingExportFailed.value = true;
    }
  } else {
    pendingImportItems.value = [];
    pendingImportFailed.value = false;
    pendingExportItems.value = [];
    pendingExportFailed.value = false;
  }

  if (canSeeWarnings.value) {
    try {
      const lowStockData = await loadLowStockItems();
      lowStockItems.value = lowStockData.items;
      lowStockFailed.value = lowStockData.failed;
    } catch (error) {
      if (error?.status === 401) {
        router.replace("/login");
        return;
      }

      lowStockItems.value = [];
      lowStockFailed.value = true;
    }
  } else {
    lowStockItems.value = [];
    lowStockFailed.value = false;
  }

  isLoading.value = false;
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

  <div v-if="errorMessage" class="dashboard-alert">{{ errorMessage }}</div>

  <div class="dashboard-grid">
    <section class="card card-pad dashboard-panel dashboard-panel--wide">
      <div class="section-head between">
        <div>
          <p class="eyebrow">KPI</p>
          <h2 class="section-title">Tổng quan vận hành</h2>
        </div>
        <span class="pill">{{
          isLoading ? "Đang tải..." : "Cập nhật gần đây"
        }}</span>
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
        <div v-if="errorMessage" class="dashboard-empty">
          <EmptyState
            title="Không thể tải dữ liệu tổng quan"
            description="Vui lòng thử lại sau hoặc kiểm tra kết nối backend."
            icon="mdi-alert-circle-outline"
          />
        </div>

        <div v-else-if="!hasDashboardData" class="dashboard-empty">
          <EmptyState
            title="Chưa có dữ liệu tổng quan"
            description="Hệ thống chưa có sản phẩm, kho hoặc tồn kho để hiển thị."
          />
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
              <div class="metric">{{ formatNumber(summary.products) }}</div>
            </div>
          </article>

          <article class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--accent">
              <i class="mdi mdi-warehouse"></i>
            </div>
            <div>
              <p class="kpi-label">Tổng kho</p>
              <div class="metric">{{ formatNumber(summary.warehouses) }}</div>
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

    <section v-if="canSeeImportApprovals" class="card card-pad dashboard-panel">
      <div class="section-head between">
        <div>
          <p class="eyebrow">Pending</p>
          <h2 class="section-title">Phiếu nhập chờ duyệt</h2>
        </div>
        <button class="text-link" @click="openRoute('/approvals')">
          Xem tất cả
        </button>
      </div>

      <div v-if="!isLoading && pendingImportFailed" class="section-warning">
        <span class="badge badge--warning">Không thể tải dữ liệu</span>
        <p class="muted">Danh sách phiếu nhập chờ duyệt chưa cập nhật.</p>
      </div>
      <div v-if="pendingImportItems.length" class="stack-list">
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
      <EmptyState
        v-if="!isLoading && !pendingImportFailed && !pendingImportItems.length"
        title="Không có phiếu nhập chờ duyệt"
        description="Tất cả phiếu nhập cần xử lý đã được hoàn tất."
      />
    </section>

    <section v-if="canSeeExportApprovals" class="card card-pad dashboard-panel">
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

      <div v-if="!isLoading && pendingExportFailed" class="section-warning">
        <span class="badge badge--warning">Không thể tải dữ liệu</span>
        <p class="muted">Danh sách phiếu xuất chờ duyệt chưa cập nhật.</p>
      </div>
      <div v-if="pendingExportItems.length" class="stack-list">
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
      <EmptyState
        v-if="!isLoading && !pendingExportFailed && !pendingExportItems.length"
        title="Không có phiếu xuất chờ duyệt"
        description="Tất cả phiếu xuất cần xử lý đã được hoàn tất."
      />
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

      <div v-if="!isLoading && lowStockFailed" class="section-warning">
        <span class="badge badge--warning">Không thể tải dữ liệu</span>
        <p class="muted">Danh sách cảnh báo tồn kho chưa cập nhật.</p>
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
      <EmptyState
        v-else-if="!isLoading"
        title="Không có cảnh báo mở"
        description="Hiện tại chưa có mặt hàng nào ở ngưỡng cảnh báo."
      />
    </section>

    <section class="card card-pad dashboard-panel">
      <div class="section-head between">
        <div>
          <p class="eyebrow">Quick Access</p>
          <h2 class="section-title">Truy cập nhanh</h2>
        </div>
      </div>

      <div class="quick-links">
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
    </section>
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

.section-head {
  margin-bottom: 16px;
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
  border-radius: 10px;
  background: var(--surface-soft);
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

.dashboard-empty {
  padding: 8px 0 4px;
}

.section-warning {
  padding: 12px;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a2c00;
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
  border-radius: 10px;
  background: #fff;
  text-align: left;
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
}

@media (max-width: 639px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}
</style>
