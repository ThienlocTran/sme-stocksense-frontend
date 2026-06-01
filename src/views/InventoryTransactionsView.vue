<script setup>
import { computed, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import DataTable from '../components/DataTable.vue'
import { useInventoryStore, warehouses } from '../data/useInventoryStore'

const store = useInventoryStore()
const q = ref('')
const warehouse = ref('')
const type = ref('')
const columns = [
  { key: 'id', label: 'Mã giao dịch' },
  { key: 'date', label: 'Ngày giao dịch' },
  { key: 'product', label: 'Sản phẩm' },
  { key: 'warehouse', label: 'Kho' },
  { key: 'type', label: 'Loại giao dịch' },
  { key: 'quantity', label: 'Số lượng thay đổi' },
  { key: 'actor', label: 'Người thực hiện' },
  { key: 'documentId', label: 'Mã phiếu liên quan' },
  { key: 'note', label: 'Ghi chú' },
]
const rows = computed(() => store.transactions.filter(item =>
  `${item.id} ${item.product} ${item.documentId}`.toLowerCase().includes(q.value.toLowerCase()) &&
  (!warehouse.value || item.warehouse === warehouse.value) &&
  (!type.value || item.type === type.value)
))
</script>

<template>
  <PageHeader title="Lịch sử giao dịch" description="Ghi nhận các thay đổi tồn kho từ nhập kho, xuất kho và điều chỉnh." />
  <SearchFilterBar v-model="q" placeholder="Tìm mã giao dịch, sản phẩm hoặc mã phiếu">
    <select v-model="warehouse" class="select"><option value="">Tất cả kho</option><option v-for="item in warehouses" :key="item">{{ item }}</option></select>
    <select v-model="type" class="select"><option value="">Tất cả loại</option><option>Nhập kho</option><option>Xuất kho</option><option>Điều chỉnh</option></select>
  </SearchFilterBar>
  <DataTable :columns="columns" :rows="rows" />
</template>
