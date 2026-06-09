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
const level = ref('')
const columns = [
  { key: 'sku', label: 'SKU' },
  { key: 'product', label: 'Tên sản phẩm' },
  { key: 'warehouse', label: 'Kho' },
  { key: 'current', label: 'Tồn hiện tại' },
  { key: 'min', label: 'Ngưỡng tối thiểu' },
  { key: 'level', label: 'Mức độ cảnh báo' },
  { key: 'detectedAt', label: 'Ngày phát hiện' },
  { key: 'status', label: 'Trạng thái xử lý' },
  { key: 'actions', label: 'Thao tác' },
]
const rows = computed(() => store.alerts.filter(item =>
  `${item.sku} ${item.product}`.toLowerCase().includes(q.value.toLowerCase()) &&
  (!warehouse.value || item.warehouse === warehouse.value) &&
  (!level.value || item.level === level.value)
))
</script>

<template>
  <PageHeader title="Cảnh báo tồn kho" description="Cảnh báo MVP khi tồn kho hiện tại nhỏ hơn hoặc bằng ngưỡng tối thiểu." />
  <SearchFilterBar v-model="q" placeholder="Tìm SKU hoặc tên sản phẩm">
    <select v-model="warehouse" class="select"><option value="">Tất cả kho</option><option v-for="item in warehouses" :key="item">{{ item }}</option></select>
    <select v-model="level" class="select"><option value="">Tất cả mức độ</option><option>Thấp</option><option>Trung bình</option><option>Cao</option><option>Khẩn cấp</option></select>
  </SearchFilterBar>
  <DataTable :columns="columns" :rows="rows">
    <template #level="{ value }"><StatusBadge :status="value" /></template>
    <template #status="{ value }"><StatusBadge :status="value" /></template>
    <template #actions><div class="actions"><button class="btn btn-sm">Xem tồn kho</button><button class="btn btn-sm">Đánh dấu xử lý</button></div></template>
  </DataTable>
</template>
