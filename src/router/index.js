import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentRoleCode, isAuthenticated } from '../services/authService'
import { canAccessRoute } from '../services/permissionService'
import DashboardView from '../views/DashboardView.vue'
import ProductsView from '../views/ProductsView.vue'
import PartnerListView from '../views/PartnerListView.vue'
import WarehousesView from '../views/WarehousesView.vue'
import InventoryView from '../views/InventoryView.vue'
import InventoryTransactionsView from '../views/InventoryTransactionsView.vue'
import LoginView from '../views/LoginView.vue'
import StockDocumentsView from '../views/StockDocumentsView.vue'
import StockDocumentCreateView from '../views/StockDocumentCreateView.vue'
import StockDocumentDetailView from '../views/StockDocumentDetailView.vue'
import ApprovalsView from '../views/ApprovalsView.vue'
import PendingExportApprovalsView from '../views/PendingExportApprovalsView.vue'
import ImportExcelView from '../views/ImportExcelView.vue'
import AlertsView from '../views/AlertsView.vue'
import ProfileView from '../views/ProfileView.vue'
import EmployeeListView from '../views/employees/EmployeeListView.vue'
import CategoryListView from '../views/categories/CategoryListView.vue'
import InventoryCountListView from '../views/inventory-counts/InventoryCountListView.vue'
import InventoryCountDetailView from '../views/inventory-counts/InventoryCountDetailView.vue'
import AiForecastView from '../views/AiForecastView.vue'
import AnimationPreviewView from '../views/AnimationPreviewView.vue'

import ReplenishmentSuggestionsView from '../views/ReplenishmentSuggestionsView.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: LoginView, meta: { title: 'Đăng nhập', layout: 'auth' } },
  { path: '/preview', component: AnimationPreviewView, meta: { title: 'Animation Preview', layout: 'auth' } },
  { path: '/dashboard', component: DashboardView, meta: { title: 'Tổng quan' } },
  { path: '/products', component: ProductsView, meta: { title: 'Sản phẩm' } },
  { path: '/partners', component: PartnerListView, meta: { title: 'Quản lý đối tác' } },
  { path: '/categories', component: CategoryListView, meta: { title: 'Danh mục' } },
  { path: '/warehouses', component: WarehousesView, meta: { title: 'Kho hàng' } },
  { path: '/inventory', component: InventoryView, meta: { title: 'Tồn kho' } },
  { path: '/inventory-transactions', component: InventoryTransactionsView, meta: { title: 'Lịch sử giao dịch' } },
  { path: '/stock-in', component: StockDocumentsView, props: { type: 'in' }, meta: { title: 'Phiếu nhập kho' } },
  { path: '/stock-in/create', component: StockDocumentCreateView, props: { type: 'in' }, meta: { title: 'Tạo phiếu nhập kho' } },
  { path: '/stock-in/:id/edit', component: StockDocumentCreateView, props: route => ({ id: route.params.id, type: 'in', mode: 'edit' }), meta: { title: 'Chỉnh sửa phiếu nhập kho' } },
  { path: '/stock-in/:id', component: StockDocumentDetailView, props: route => ({ id: route.params.id, type: 'in' }), meta: { title: 'Chi tiết phiếu nhập kho' } },
  { path: '/stock-out', component: StockDocumentsView, props: { type: 'out' }, meta: { title: 'Phiếu xuất kho' } },
  { path: '/stock-out/create', component: StockDocumentCreateView, props: { type: 'out' }, meta: { title: 'Tạo phiếu xuất kho' } },
  { path: '/stock-out/:id/edit', component: StockDocumentCreateView, props: route => ({ id: route.params.id, type: 'out', mode: 'edit' }), meta: { title: 'Chỉnh sửa phiếu xuất kho' } },
  { path: '/stock-out/:id', component: StockDocumentDetailView, props: route => ({ id: route.params.id, type: 'out' }), meta: { title: 'Chi tiết phiếu xuất kho' } },
  { path: '/export-approvals', component: PendingExportApprovalsView, meta: { title: 'Phiếu xuất chờ duyệt' } },
  { path: '/pending-export-approvals', component: PendingExportApprovalsView, meta: { title: 'Phiếu xuất chờ duyệt' } },
  { path: '/approvals', component: ApprovalsView, meta: { title: 'Chờ duyệt' } },
  { path: '/import-excel', component: ImportExcelView, meta: { title: 'Import Excel' } },
  { path: '/alerts', component: AlertsView, meta: { title: 'Cảnh báo tồn kho' } },
  { path: '/profile', component: ProfileView, meta: { title: 'Hồ sơ' } },
  { path: '/employees', component: EmployeeListView, meta: { title: 'Nhân viên' } },
  { path: '/users', redirect: '/employees' },
  { path: '/inventory-counts', component: InventoryCountListView, meta: { title: 'Kiểm kê kho' } },
  { path: '/inventory-counts/:id', component: InventoryCountDetailView, props: true, meta: { title: 'Chi tiết kiểm kê kho' } },
  { path: '/forecast', component: AiForecastView, meta: { title: 'Dự báo AI' } },
  { path: '/replenishment-suggestions', component: ReplenishmentSuggestionsView, meta: { title: 'Gợi ý nhập hàng' } },
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
