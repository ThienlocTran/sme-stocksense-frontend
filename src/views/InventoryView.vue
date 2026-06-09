<script setup>
import { computed, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import DataTable from '../components/DataTable.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useInventoryStore, warehouses } from '../data/useInventoryStore'

const store = useInventoryStore()
const q = ref('')
const warehouse = ref('')
const status = ref('')
const columns = [
  { key: 'sku', label: 'SKU' },
  { key: 'product', label: 'Tên sản phẩm' },
  { key: 'warehouse', label: 'Kho' },
  { key: 'current', label: 'Tồn hiện tại' },
  { key: 'min', label: 'Ngưỡng tối thiểu' },
  { key: 'unit', label: 'Đơn vị tính' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'updatedAt', label: 'Cập nhật lần cuối' },
]
const rows = computed(() => store.inventory.filter(item =>
  `${item.sku} ${item.product}`.toLowerCase().includes(q.value.toLowerCase()) &&
  (!warehouse.value || item.warehouse === warehouse.value) &&
  (!status.value || item.status === status.value)
))
</script>

<template>
  <PageHeader title="Tồn kho" description="Tra cứu số lượng hiện tại theo sản phẩm và kho." />
  <SearchFilterBar v-model="q" placeholder="Tìm kiếm sản phẩm">
    <select v-model="warehouse" class="select"><option value="">Tất cả kho</option><option v-for="item in warehouses" :key="item">{{ item }}</option></select>
    <select v-model="status" class="select"><option value="">Tất cả trạng thái</option><option>Đủ hàng</option><option>Sắp hết</option><option>Thiếu hàng</option></select>
  </SearchFilterBar>
  <DataTable :columns="columns" :rows="rows">
    <template #status="{ value }"><StatusBadge :status="value" /></template>
  </DataTable>
</template>
