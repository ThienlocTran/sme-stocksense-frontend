import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import PartnerListView from '../views/PartnerListView.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { title: 'Tổng quan' }
  },
  {
    path: '/partners',
    name: 'partners',
    component: PartnerListView,
    meta: { title: 'Quản lý đối tác' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
