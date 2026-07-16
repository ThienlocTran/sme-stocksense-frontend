<script setup>
import { computed } from 'vue'
import { normalizeRole } from '../services/authService'
import { canImportExcel, canManageEmployees } from '../services/permissionService'
import { useAuthStore } from '../stores/auth'

const items = [
  ['Tổng quan', '/dashboard', 'mdi-view-dashboard-outline'],
  ['Nhân viên', '/employees', 'mdi-account-group-outline', 'admin'],
  ['Sản phẩm', '/products', 'mdi-package-variant-closed'],
  ['Nhà cung cấp', '/partners', 'mdi-truck-delivery-outline', 'manage'],
  ['Danh mục', '/categories', 'mdi-shape-outline'],
  ['Kho hàng', '/warehouses', 'mdi-warehouse'],
  ['Tồn kho', '/inventory', 'mdi-clipboard-list-outline'],
  ['Lịch sử giao dịch', '/inventory-transactions', 'mdi-history'],
  ['Phiếu nhập kho', '/stock-in', 'mdi-tray-arrow-down', 'stock-in'],
  ['Phiếu xuất kho', '/stock-out', 'mdi-tray-arrow-up', 'employee'],
  ['Phiếu xuất chờ duyệt', '/pending-export-approvals', 'mdi-file-clock-outline', 'approval'],
  ['Chờ duyệt', '/approvals', 'mdi-check-decagram-outline', 'approval'],
  ['Import Excel', '/import-excel', 'mdi-file-excel-outline', 'import-excel'],
  ['Cảnh báo tồn kho', '/alerts', 'mdi-alert-outline'],
]
const authStore = useAuthStore()
const currentRole = computed(() => normalizeRole(authStore.currentRole))
const visibleItems = computed(() => items.filter(item => {
  const role = currentRole.value
  if (item[3] === 'admin') return canManageEmployees(role)
  if (item[3] === 'import-excel') return canImportExcel(role)
  if (item[3] === 'manage') return role === 'ADMIN' || role === 'MANAGER'
  if (item[3] === 'approval') return role === 'ADMIN' || role === 'MANAGER'
  if (item[3] === 'stock-in') return role === 'ADMIN' || role === 'MANAGER' || role === 'EMPLOYEE'
  if (item[3] === 'employee') return role === 'ADMIN' || role === 'EMPLOYEE'
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