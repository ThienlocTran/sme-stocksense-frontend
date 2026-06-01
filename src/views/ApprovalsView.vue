<script setup>
import { computed, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import DataTable from '../components/DataTable.vue'
import StatusBadge from '../components/StatusBadge.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useInventoryStore, warehouses } from '../data/useInventoryStore'

const store = useInventoryStore()
const activeTab = ref('in')
const q = ref('')
const warehouse = ref('')
const creator = ref('')
const createdAt = ref('')
const rejectId = ref('')
const reason = ref('')
const source = computed(() => activeTab.value === 'in' ? store.pendingIn : store.pendingOut)
const detailBase = computed(() => activeTab.value === 'in' ? '/stock-in' : '/stock-out')
const rows = computed(() => source.value.filter(item =>
  `${item.id} ${item.partner}`.toLowerCase().includes(q.value.toLowerCase()) &&
  (!warehouse.value || item.warehouse === warehouse.value) &&
  (!creator.value || item.creator === creator.value) &&
  (!createdAt.value || item.createdAt === createdAt.value)
))
const columns = [
  { key: 'id', label: 'Mã phiếu' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'warehouse', label: 'Kho' },
  { key: 'partner', label: 'Đối tác' },
  { key: 'creator', label: 'Người tạo' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'actions', label: 'Thao tác' },
]
function reject() {
  if (!reason.value.trim()) return
  store.rejectDocument(rejectId.value, reason.value)
  rejectId.value = ''
  reason.value = ''
}
</script>

<template>
  <PageHeader title="Chờ duyệt" description="Duyệt hoặc từ chối phiếu nhập/xuất kho đang chờ quản lý xử lý." />
  <div class="tabs approval-tabs">
    <button class="tab" :class="{ active: activeTab === 'in' }" @click="activeTab = 'in'">Phiếu nhập chờ duyệt</button>
    <button class="tab" :class="{ active: activeTab === 'out' }" @click="activeTab = 'out'">Phiếu xuất chờ duyệt</button>
  </div>
  <SearchFilterBar v-model="q" placeholder="Tìm mã phiếu hoặc đối tác">
    <select v-model="warehouse" class="select"><option value="">Tất cả kho</option><option v-for="item in warehouses" :key="item">{{ item }}</option></select>
    <input v-model="createdAt" class="input" placeholder="Ngày tạo, ví dụ 30/05/2026" />
    <select v-model="creator" class="select"><option value="">Tất cả người tạo</option><option>Lê Quốc Bảo</option><option>Phạm Thùy Linh</option></select>
  </SearchFilterBar>
  <DataTable :columns="columns" :rows="rows" empty-text="Không có phiếu chờ duyệt">
    <template #status="{ value }"><StatusBadge :status="value" /></template>
    <template #actions="{ row }">
      <div class="actions">
        <RouterLink :to="`${detailBase}/${row.id}`" class="btn btn-sm">Xem chi tiết</RouterLink>
        <button class="btn btn-sm btn-success" @click="store.approveDocument(row.id)">Chấp nhận</button>
        <button class="btn btn-sm btn-danger" @click="rejectId = row.id">Từ chối</button>
      </div>
    </template>
  </DataTable>
  <ConfirmDialog :open="Boolean(rejectId)" title="Từ chối phiếu" message="Lý do từ chối là bắt buộc để nhân viên kho biết cần sửa gì." confirm-text="Từ chối" danger @cancel="rejectId = ''; reason = ''" @confirm="reject">
    <textarea v-model="reason" class="textarea" placeholder="Nhập lý do từ chối"></textarea>
  </ConfirmDialog>
</template>

<style scoped>
.approval-tabs { margin-bottom: 16px; }
</style>
