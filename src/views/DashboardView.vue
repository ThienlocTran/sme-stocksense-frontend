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
