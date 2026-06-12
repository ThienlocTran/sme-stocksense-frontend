<script setup>
import { computed } from 'vue'
import { useInventoryStore } from '../data/useInventoryStore'

const store = useInventoryStore()
const items = [
  ['Tổng quan', '/dashboard', 'mdi-view-dashboard-outline'],
  ['Sản phẩm', '/products', 'mdi-package-variant-closed'],
  ['Danh mục', '/categories', 'mdi-shape-outline'],
  ['Kho hàng', '/warehouses', 'mdi-warehouse'],
  ['Tồn kho', '/inventory', 'mdi-clipboard-list-outline'],
  ['Lịch sử giao dịch', '/inventory-transactions', 'mdi-history'],
  ['Phiếu nhập kho', '/stock-in', 'mdi-tray-arrow-down'],
  ['Phiếu xuất kho', '/stock-out', 'mdi-tray-arrow-up'],
  ['Chờ duyệt', '/approvals', 'mdi-check-decagram-outline', 'approval'],
  ['Import Excel', '/import-excel', 'mdi-file-excel-outline'],
  ['Cảnh báo tồn kho', '/alerts', 'mdi-alert-outline'],
  ['Nhân viên', '/employees', 'mdi-account-group-outline', 'admin'],
  ['Nhân viên & phân quyền', '/users', 'mdi-account-cog-outline', 'admin'],
]
const visibleItems = computed(() => items.filter(item => {
  if (item[3] === 'admin') return store.isAdmin
  if (item[3] === 'approval') return store.isAdmin || store.isManager
  return true
}))
</script>

<template>
  <aside class="sidebar">
    <RouterLink to="/dashboard" class="brand">
      <span class="brand-mark">S</span>
      <span>
        <strong>SME StockSense</strong>
        <small>Quản lý tồn kho MVP</small>
      </span>
    </RouterLink>
    <nav class="nav-list">
      <RouterLink v-for="[label, to, icon] in visibleItems" :key="to" :to="to" class="nav-item">
        <i class="mdi" :class="icon"></i>
        <span>{{ label }}</span>
      </RouterLink>
    </nav>
    <div class="sidebar-note">
      <strong>Phạm vi hiện tại</strong>
      <span>CRUD kho, phiếu nhập/xuất, duyệt phiếu và import theo mẫu.</span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar { position: fixed; inset: 0 auto 0 0; width: 260px; background: #0f172a; color: #e5e7eb; padding: 18px 14px; display: flex; flex-direction: column; z-index: 20; }
.brand { display: flex; align-items: center; gap: 12px; padding: 8px 10px 18px; border-bottom: 1px solid rgba(255,255,255,.1); }
.brand-mark { width: 38px; height: 38px; border-radius: 8px; background: #2563eb; display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 20px; }
.brand strong { display: block; color: #fff; line-height: 20px; }
.brand small { display: block; color: #94a3b8; margin-top: 2px; }
.nav-list { display: grid; gap: 4px; margin-top: 16px; }
.nav-item { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 9px 10px; border-radius: 8px; color: #cbd5e1; font-weight: 600; }
.nav-item:hover { background: rgba(255,255,255,.07); color: #fff; }
.nav-item.router-link-active { background: #2563eb; color: #fff; }
.nav-item i { font-size: 20px; width: 22px; text-align: center; }
.sidebar-note { margin-top: auto; padding: 12px; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; background: rgba(255,255,255,.05); display: grid; gap: 4px; color: #cbd5e1; line-height: 18px; }
.sidebar-note strong { color: #fff; }

@media (max-width: 1023px) {
  .sidebar { position: static; width: 100%; min-height: auto; }
  .nav-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sidebar-note { display: none; }
}
</style>
