<script setup>
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useInventoryStore } from '../data/useInventoryStore'

const store = useInventoryStore()
const columns = [
  { key: 'code', label: 'Mã kho' },
  { key: 'name', label: 'Tên kho' },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'manager', label: 'Người phụ trách' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'actions', label: 'Thao tác' },
]
</script>

<template>
  <PageHeader title="Kho hàng" description="Quản lý danh sách kho ở mức cơ bản, chưa dùng sơ đồ kệ/vị trí.">
    <button class="btn btn-primary"><i class="mdi mdi-plus"></i>Thêm kho</button>
  </PageHeader>
  <DataTable :columns="columns" :rows="store.warehouseList">
    <template #status="{ value }"><StatusBadge :status="value" /></template>
    <template #actions><div class="actions"><button class="btn btn-sm">Sửa</button><button class="btn btn-sm">Xem</button></div></template>
  </DataTable>
</template>
