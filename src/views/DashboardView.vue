
<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 m-0">Tổng quan hệ thống</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Hệ thống quản lý và dự báo tồn kho thông minh dành cho SME</p>
      </div>
      <div class="text-xs text-slate-400 dark:text-slate-500 font-mono">
        Cập nhật: 10/06/2026 03:15
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng sản phẩm</p>
            <h3 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">1,248</h3>
          </div>
          <div class="p-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform duration-300">
            <i class="mdi mdi-package-variant-closed text-2xl"></i>
          </div>
        </div>
        <div class="flex items-center gap-1 mt-4 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <i class="mdi mdi-arrow-up-bold"></i>
          <span>+12.5% so với tháng trước</span>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Giá trị tồn kho</p>
            <h3 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">1.85B ₫</h3>
          </div>
          <div class="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
            <i class="mdi mdi-currency-usd text-2xl"></i>
          </div>
        </div>
        <div class="flex items-center gap-1 mt-4 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <i class="mdi mdi-arrow-up-bold"></i>
          <span>+4.2% so với tháng trước</span>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Cảnh báo tồn kho</p>
            <h3 class="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">18</h3>
          </div>
          <div class="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform duration-300">
            <i class="mdi mdi-alert-circle-outline text-2xl"></i>
          </div>
        </div>
        <div class="flex items-center gap-1 mt-4 text-xs text-rose-600 dark:text-rose-400 font-medium">
          <i class="mdi mdi-alert"></i>
          <span>Cần nhập hàng ngay</span>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Đối tác liên kết</p>
            <h3 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">42</h3>
          </div>
          <div class="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-xl text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform duration-300">
            <i class="mdi mdi-handshake-outline text-2xl"></i>
          </div>
        </div>
        <div class="flex items-center gap-1 mt-4 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <i class="mdi mdi-plus"></i>
          <span>Đã thêm 2 đối tác mới tuần này</span>
        </div>
      </div>
    </div>

    <!-- Quick Navigation -->
    <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Lối tắt nhanh</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <router-link to="/partners" class="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-decoration-none group">
          <div class="p-3 bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-lg">
            <i class="mdi mdi-account-group text-xl"></i>
          </div>
          <div>
            <h4 class="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-violet-600 transition-colors m-0 text-left">Quản lý đối tác</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 text-left mt-0.5">Xem danh sách nhà cung cấp, khách hàng và quản lý liên hệ</p>
          </div>
        </router-link>
        <div class="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-not-allowed opacity-60">
          <div class="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">
            <i class="mdi mdi-home-warehouse text-xl"></i>
          </div>
          <div>
            <h4 class="font-semibold text-slate-800 dark:text-slate-100 m-0 text-left">Quản lý kho hàng</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 text-left mt-0.5">Quản lý thông tin và trạng thái hoạt động các kho hàng</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Dashboard view
</script>

<script setup>
import PageHeader from '../components/PageHeader.vue'
import StatusBadge from '../components/StatusBadge.vue'
import DataTable from '../components/DataTable.vue'
import { useInventoryStore } from '../data/useInventoryStore'

const store = useInventoryStore()
const columns = [
  { key: 'id', label: 'Mã phiếu' },
  { key: 'type', label: 'Loại phiếu' },
  { key: 'warehouse', label: 'Kho' },
  { key: 'creator', label: 'Người tạo' },
  { key: 'status', label: 'Trạng thái' },
]
</script>

<template>
  <PageHeader title="Tổng quan" description="Theo dõi nhanh tồn kho, phiếu chờ duyệt và cảnh báo trong doanh nghiệp." />
  <section class="grid grid-4">
    <div class="card card-pad"><span class="muted">Sản phẩm</span><div class="metric">{{ store.products.length }}</div></div>
    <div class="card card-pad"><span class="muted">Kho hàng</span><div class="metric">{{ store.warehouseList.length }}</div></div>
    <div class="card card-pad"><span class="muted">Phiếu chờ duyệt</span><div class="metric">{{ store.pendingIn.length + store.pendingOut.length }}</div></div>
    <div class="card card-pad"><span class="muted">Cảnh báo tồn kho</span><div class="metric">{{ store.alerts.length }}</div></div>
  </section>
  <section class="grid grid-2 dashboard-grid">
    <div class="card card-pad">
      <h2 class="section-title">Trạng thái tồn kho</h2>
      <div class="stock-list">
        <div v-for="item in store.inventory" :key="item.sku + item.warehouse" class="between stock-row">
          <div><strong>{{ item.product }}</strong><span>{{ item.warehouse }} · {{ item.current }} {{ item.unit }}</span></div>
          <StatusBadge :status="item.status" />
        </div>
      </div>
    </div>
    <DataTable :columns="columns" :rows="[...store.pendingIn, ...store.pendingOut]" empty-text="Không có phiếu chờ duyệt">
      <template #status="{ value }"><StatusBadge :status="value" /></template>
    </DataTable>
  </section>
</template>

<style scoped>
.dashboard-grid { margin-top: 16px; align-items: start; }
.stock-list { display: grid; gap: 10px; margin-top: 14px; }
.stock-row { padding: 12px; border: 1px solid var(--border); border-radius: 8px; }
.stock-row span { display: block; color: var(--muted); margin-top: 3px; }
</style>

