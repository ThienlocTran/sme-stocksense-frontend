<script setup>
import { computed, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useInventoryStore } from '../data/useInventoryStore'

const store = useInventoryStore()
const q = ref('')
const columns = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Tên sản phẩm' },
  { key: 'category', label: 'Nhóm hàng' },
  { key: 'unit', label: 'Đơn vị tính' },
  { key: 'min', label: 'Ngưỡng tối thiểu' },
  { key: 'price', label: 'Đơn giá' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'actions', label: 'Thao tác' },
]
const rows = computed(() => store.products.filter(item => `${item.sku} ${item.name}`.toLowerCase().includes(q.value.toLowerCase())))
</script>

<template>
  <PageHeader title="Sản phẩm" description="Quản lý danh mục sản phẩm cơ bản cho tồn kho.">
    <button class="btn btn-primary"><i class="mdi mdi-plus"></i>Thêm sản phẩm</button>
  </PageHeader>
  <SearchFilterBar v-model="q" placeholder="Tìm theo SKU hoặc tên sản phẩm" />
  <DataTable :columns="columns" :rows="rows">
    <template #price="{ value }">{{ value.toLocaleString('vi-VN') }} đ</template>
    <template #status="{ value }"><StatusBadge :status="value" /></template>
    <template #actions><div class="actions"><button class="btn btn-sm">Sửa</button><button class="btn btn-sm">Xem</button></div></template>
  </DataTable>
</template>
