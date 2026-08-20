import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentRoleCode, isAuthenticated } from '../services/authService'
import { canAccessRoute } from '../services/permissionService'


const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: () => import('../views/LoginView.vue'), meta: { title: 'Đăng nhập', layout: 'auth' } },
  { path: '/preview', component: () => import('../views/AnimationPreviewView.vue'), meta: { title: 'Animation Preview', layout: 'auth' } },
  { path: '/dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: 'Tổng quan' } },
  { path: '/products', component: () => import('../views/ProductsView.vue'), meta: { title: 'Sản phẩm' } },
  { path: '/partners', component: () => import('../views/PartnerListView.vue'), meta: { title: 'Quản lý đối tác' } },
  { path: '/categories', component: () => import('../views/categories/CategoryListView.vue'), meta: { title: 'Danh mục' } },
  { path: '/warehouses', component: () => import('../views/WarehousesView.vue'), meta: { title: 'Kho hàng' } },
  { path: '/inventory', component: () => import('../views/InventoryView.vue'), meta: { title: 'Tồn kho' } },
  { path: '/inventory-transactions', component: () => import('../views/InventoryTransactionsView.vue'), meta: { title: 'Lịch sử giao dịch' } },
  { path: '/stock-in', component: () => import('../views/StockDocumentsView.vue'), props: { type: 'in' }, meta: { title: 'Phiếu nhập kho' } },
  { path: '/stock-in/create', component: () => import('../views/StockDocumentCreateView.vue'), props: { type: 'in' }, meta: { title: 'Tạo phiếu nhập kho' } },
  { path: '/stock-in/:id/edit', component: () => import('../views/StockDocumentCreateView.vue'), props: route => ({ id: route.params.id, type: 'in', mode: 'edit' }), meta: { title: 'Chỉnh sửa phiếu nhập kho' } },
  { path: '/stock-in/:id', component: () => import('../views/StockDocumentDetailView.vue'), props: route => ({ id: route.params.id, type: 'in' }), meta: { title: 'Chi tiết phiếu nhập kho' } },
  { path: '/stock-out', component: () => import('../views/StockDocumentsView.vue'), props: { type: 'out' }, meta: { title: 'Phiếu xuất kho' } },
  { path: '/stock-out/create', component: () => import('../views/StockDocumentCreateView.vue'), props: { type: 'out' }, meta: { title: 'Tạo phiếu xuất kho' } },
  { path: '/stock-out/:id/edit', component: () => import('../views/StockDocumentCreateView.vue'), props: route => ({ id: route.params.id, type: 'out', mode: 'edit' }), meta: { title: 'Chỉnh sửa phiếu xuất kho' } },
  { path: '/stock-out/:id', component: () => import('../views/StockDocumentDetailView.vue'), props: route => ({ id: route.params.id, type: 'out' }), meta: { title: 'Chi tiết phiếu xuất kho' } },
  { path: '/export-approvals', redirect: '/approvals' },
  { path: '/pending-export-approvals', redirect: '/approvals' },
  { path: '/approvals', component: () => import('../views/ApprovalsView.vue'), meta: { title: 'Chờ duyệt' } },
  { path: '/import-excel', component: () => import('../views/ImportExcelView.vue'), meta: { title: 'Import Excel' } },
  { path: '/alerts', component: () => import('../views/AlertsView.vue'), meta: { title: 'Cảnh báo tồn kho' } },
  { path: '/profile', component: () => import('../views/ProfileView.vue'), meta: { title: 'Hồ sơ' } },
  { path: '/employees', component: () => import('../views/employees/EmployeeListView.vue'), meta: { title: 'Nhân viên' } },
  { path: '/users', redirect: '/employees' },
  { path: '/inventory-counts', component: () => import('../views/inventory-counts/InventoryCountListView.vue'), meta: { title: 'Kiểm kê kho' } },
  { path: '/inventory-counts/:id', component: () => import('../views/inventory-counts/InventoryCountDetailView.vue'), props: true, meta: { title: 'Chi tiết kiểm kê kho' } },
  { path: '/inventory-adjustments/:id', component: () => import('../views/inventory-counts/InventoryAdjustmentView.vue'), props: true, meta: { title: 'Phiếu điều chỉnh tồn kho' } },
  { path: '/forecast', component: () => import('../views/AiForecastView.vue'), meta: { title: 'Dự báo AI' } },
  { path: '/replenishment-suggestions', component: () => import('../views/ReplenishmentSuggestionsView.vue'), meta: { title: 'Gợi ý nhập hàng' } },
  { path: '/settings', component: () => import('../views/SettingsView.vue'), meta: { title: 'Cấu hình hệ thống' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(to => {
  const isAuthRoute = to.meta.layout === 'auth'
  const authenticated = isAuthenticated()

  if (!isAuthRoute && !authenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (isAuthRoute && authenticated) return '/dashboard'

  if (!canAccessRoute(to.path, getCurrentRoleCode())) {
    if (to.path.startsWith('/stock-in')) return '/stock-in'
    if (to.path.startsWith('/stock-out')) return '/stock-out'
    return '/dashboard'
  }
  return true
})

export default router
