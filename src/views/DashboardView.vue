<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import EmptyState from "../components/EmptyState.vue";
import PageHeader from "../components/PageHeader.vue";
import { getLowStockInventory } from "../services/inventoryService";
import { getPendingApprovals as getPendingImportApprovals } from "../services/importReceiptService";
import { getCurrentRoleCode } from "../services/authService";
import { getProducts } from "../services/productService";
import { getPendingExportApprovals } from "../services/stockOutApprovalService";
import { getWarehouses } from "../services/warehouseService";

const router = useRouter();
const isLoading = ref(true);
const errorMessage = ref("");
const canSeeApprovals = ref(false);
const summary = ref({ products: 0, warehouses: 0, lowStock: 0, pending: 0 });
const summaryFailures = ref({
  products: false,
  warehouses: false,
  lowStock: false,
  pending: false,
});
const pendingItems = ref([]);
const lowStockItems = ref([]);
const pendingFailed = ref(false);
const lowStockFailed = ref(false);

const quickAccess = [
  {
    title: "Sản phẩm",
    description: "Quản lý sản phẩm và ngưỡng tồn",
    route: "/products",
    icon: "mdi-package-variant-closed",
  },
  {
    title: "Tồn kho",
    description: "Theo dõi tồn kho và cảnh báo",
    route: "/inventory",
    icon: "mdi-warehouse",
  },
  {
    title: "Phiếu nhập",
    description: "Xem và xử lý phiếu nhập",
    route: "/stock-in",
    icon: "mdi-tray-plus",
  },
  {
    title: "Phiếu xuất",
    description: "Theo dõi phiếu xuất và duyệt",
    route: "/stock-out",
    icon: "mdi-tray-arrow-up",
  },
  {
    title: "Duyệt",
    description: "Xử lý các phiếu chờ duyệt",
    route: "/approvals",
    icon: "mdi-clipboard-check-outline",
  },
  {
    title: "Cảnh báo",
    description: "Nhật ký cảnh báo tồn kho",
    route: "/alerts",
    icon: "mdi-bell-alert-outline",
  },
];

const visibleQuickAccess = computed(() =>
  quickAccess.filter(
    (item) => item.route !== "/approvals" || canSeeApprovals.value,
  ),
);

onMounted(loadDashboard);

async function loadDashboard() {
  isLoading.value = true;
  errorMessage.value = "";
  const roleCode = getCurrentRoleCode();
  canSeeApprovals.value = roleCode === "ADMIN" || roleCode === "MANAGER";
  summaryFailures.value = {
    products: false,
    warehouses: false,
    lowStock: false,
    pending: false,
  };
  pendingFailed.value = false;
  lowStockFailed.value = false;

  const pendingRequests = canSeeApprovals.value
    ? [
        getPendingExportApprovals({ page: 0, size: 4 }),
        getPendingImportApprovals({ page: 0, size: 4 }),
      ]
    : [Promise.resolve(null), Promise.resolve(null)];

  const [
    productsResult,
    lowStockResult,
    exportPendingResult,
    importPendingResult,
    warehousesResult,
  ] = await Promise.allSettled([
    getProducts({ page: 0, size: 1 }),
    getLowStockInventory({ page: 0, size: 4 }),
    ...pendingRequests,
    getWarehouses({ status: "HOAT_DONG" }),
  ]);

  const productsData =
    productsResult.status === "fulfilled" ? productsResult.value : null;
  const lowStockData =
    lowStockResult.status === "fulfilled" ? lowStockResult.value : null;
  const exportPendingData =
    exportPendingResult.status === "fulfilled"
      ? exportPendingResult.value
      : null;
  const importPendingData =
    importPendingResult.status === "fulfilled"
      ? importPendingResult.value
      : null;
  const warehousesData =
    warehousesResult.status === "fulfilled" ? warehousesResult.value : null;

  if (productsResult.status === "rejected") {
    summaryFailures.value.products = true;
    console.error(
      "[DashboardView] Failed to load products KPI data",
      productsResult.reason,
    );
  }
  if (warehousesResult.status === "rejected") {
    summaryFailures.value.warehouses = true;
    console.error(
      "[DashboardView] Failed to load warehouses KPI data",
      warehousesResult.reason,
    );
  }
  if (lowStockResult.status === "rejected") {
    summaryFailures.value.lowStock = true;
    lowStockFailed.value = true;
    console.error(
      "[DashboardView] Failed to load low stock data",
      lowStockResult.reason,
    );
  }
  if (exportPendingResult.status === "rejected") {
    pendingFailed.value = true;
    console.error(
      "[DashboardView] Failed to load export pending approvals data",
      exportPendingResult.reason,
    );
  }
  if (importPendingResult.status === "rejected") {
    pendingFailed.value = true;
    console.error(
      "[DashboardView] Failed to load import pending approvals data",
      importPendingResult.reason,
    );
  }
  summaryFailures.value.pending =
    exportPendingResult.status === "rejected" ||
    importPendingResult.status === "rejected";

  summary.value = {
    products: readCount(productsData),
    warehouses: readCount(warehousesData),
    lowStock: readCount(lowStockData),
    pending: readCount(exportPendingData) + readCount(importPendingData),
  };

  pendingItems.value = [
    ...mapPendingItems(exportPendingData, "export"),
    ...mapPendingItems(importPendingData, "import"),
  ].slice(0, 4);

  lowStockItems.value = mapLowStockItems(lowStockData);

  if (
    [
      productsResult,
      lowStockResult,
      exportPendingResult,
      importPendingResult,
      warehousesResult,
    ].some((item) => item.status === "rejected")
  ) {
    errorMessage.value =
      "Một số dữ liệu dashboard chưa tải được. Hệ thống vẫn hiển thị các thông tin có sẵn.";
  }

  isLoading.value = false;
}

function readCount(payload) {
  if (!payload) return 0;
  if (Array.isArray(payload)) return payload.length;
  if (typeof payload.totalElements === "number") return payload.totalElements;
  if (Array.isArray(payload.content)) return payload.content.length;
  return 0;
}

function mapPendingItems(payload, type) {
  const items = payload?.content || payload || [];
  return items.slice(0, 2).map((item) => ({
    id: item.id,
    code: item.code || item.documentCode || `#${item.id}`,
    label: type === "export" ? "Phiếu xuất" : "Phiếu nhập",
    subtitle:
      item.warehouseName ||
      item.warehouse ||
      item.createdByName ||
      item.createdBy ||
      "Chưa có thông tin",
    route: type === "export" ? "/pending-export-approvals" : "/approvals",
  }));
}

function mapLowStockItems(payload) {
  const items = payload?.content || payload || [];
  return items.slice(0, 4).map((item) => ({
    id:
      item.id ||
      `${item.productName || item.product?.name || "item"}-${item.warehouseName || item.warehouse?.name || "warehouse"}`,
    productName:
      item.productName ||
      item.product?.name ||
      item.productCode ||
      item.code ||
      "Sản phẩm",
    warehouseName: item.warehouseName || item.warehouse?.name || "Kho",
    available:
      item.currentQuantity ?? item.quantity ?? item.availableQuantity ?? 0,
    minStock: item.minStock ?? item.minQuantity ?? item.threshold ?? 0,
  }));
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function openRoute(route) {
  router.push(route);
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

      <div class="kpi-grid">
        <article class="kpi-card">
          <div class="kpi-card__icon">
            <i class="mdi mdi-package-variant-closed"></i>
          </div>
          <div>
            <p class="kpi-label">Sản phẩm</p>
            <div class="metric">
              {{
                summaryFailures.products ? "—" : formatNumber(summary.products)
              }}
            </div>
          </div>
        </article>

        <article class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--accent">
            <i class="mdi mdi-warehouse"></i>
          </div>
          <div>
            <p class="kpi-label">Kho hoạt động</p>
            <div class="metric">
              {{
                summaryFailures.warehouses
                  ? "—"
                  : formatNumber(summary.warehouses)
              }}
            </div>
          </div>
        </article>

        <article class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--warn">
            <i class="mdi mdi-alert-circle-outline"></i>
          </div>
          <div>
            <p class="kpi-label">Sắp hết hàng</p>
            <div class="metric">
              {{
                summaryFailures.lowStock ? "—" : formatNumber(summary.lowStock)
              }}
            </div>
          </div>
        </article>

        <article v-if="canSeeApprovals" class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--success">
            <i class="mdi mdi-clock-outline"></i>
          </div>
          <div>
            <p class="kpi-label">Chờ xử lý</p>
            <div class="metric">
              {{
                summaryFailures.pending ? "—" : formatNumber(summary.pending)
              }}
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-if="canSeeApprovals" class="card card-pad dashboard-panel">
      <div class="section-head between">
        <div>
          <p class="eyebrow">Pending</p>
          <h2 class="section-title">Phiếu cần duyệt</h2>
        </div>
        <button
          v-if="canSeeApprovals"
          class="text-link"
          @click="openRoute('/approvals')"
        >
          Xem tất cả
        </button>
      </div>

      <div v-if="!isLoading && pendingFailed" class="section-warning">
        <span class="badge badge--warning">Không thể tải dữ liệu</span>
        <p class="muted">Danh sách phiếu cần duyệt chưa cập nhật.</p>
      </div>
      <div v-else-if="pendingItems.length" class="stack-list">
        <div
          v-for="item in pendingItems"
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
        v-else-if="!isLoading"
        title="Không có phiếu chờ duyệt"
        description="Tất cả việc cần xử lý đã được hoàn tất."
      />
    </section>

    <section class="card card-pad dashboard-panel">
      <div class="section-head between">
        <div>
          <p class="eyebrow">Low Stock</p>
          <h2 class="section-title">Sản phẩm sắp hết</h2>
        </div>
        <button class="text-link" @click="openRoute('/inventory')">
          Xem chi tiết
        </button>
      </div>

      <div v-if="!isLoading && lowStockFailed" class="section-warning">
        <span class="badge badge--warning">Không thể tải dữ liệu</span>
        <p class="muted">Danh sách sản phẩm sắp hết chưa cập nhật.</p>
      </div>
      <div v-else-if="lowStockItems.length" class="stack-list">
        <div v-for="item in lowStockItems" :key="item.id" class="list-item">
          <div>
            <strong>{{ item.productName }}</strong>
            <p>{{ item.warehouseName }}</p>
          </div>
          <span class="muted">{{ item.available }}/{{ item.minStock }}</span>
        </div>
      </div>
      <EmptyState
        v-else-if="!isLoading"
        title="Không có mặt hàng sắp hết"
        description="Tồn kho hiện đang ở mức an toàn."
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
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
}

.dashboard-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dashboard-panel--wide {
  grid-column: 1 / -1;
}

.dashboard-alert {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.section-head {
  margin-bottom: 6px;
}

.eyebrow {
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}

.pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  background: #eff6ff;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.text-link {
  background: none;
  border: 0;
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
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
  color: #0284c7;
}

.kpi-card__icon--warn {
  background: #fef3c7;
  color: #b45309;
}

.kpi-card__icon--success {
  background: #dcfce7;
  color: #15803d;
}

.kpi-label {
  margin: 0 0 2px;
  color: var(--muted);
  font-size: 12px;
}

.stack-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.list-item strong {
  display: block;
  margin-bottom: 2px;
}

.list-item p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.badge--warning {
  background: #fef3c7;
  color: #b45309;
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.quick-link {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  background: #fff;
  text-align: left;
}

.quick-link i {
  font-size: 18px;
  color: var(--primary);
  margin-top: 2px;
}

.quick-link span {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.quick-link small {
  color: var(--muted);
  line-height: 1.4;
}

@media (max-width: 1023px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .kpi-grid,
  .quick-links {
    grid-template-columns: 1fr;
  }

  .list-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
