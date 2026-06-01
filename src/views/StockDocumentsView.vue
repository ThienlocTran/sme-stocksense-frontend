<script setup>
import { computed, ref, watch } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import DataTable from '../components/DataTable.vue'
import StatusBadge from '../components/StatusBadge.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useInventoryStore, documentStatuses, warehouses } from '../data/useInventoryStore'

const props = defineProps({ type: { type: String, required: true } })
const store = useInventoryStore()
const q = ref('')
const warehouse = ref('')
const status = ref('')
const selectedIds = ref([])
const rejectId = ref('')
const rejectReason = ref('')

const editableStatuses = ['Nháp', 'Từ chối']
const isIn = computed(() => props.type === 'in')
const title = computed(() => isIn.value ? 'Phiếu nhập kho' : 'Phiếu xuất kho')
const createPath = computed(() => isIn.value ? '/stock-in/create' : '/stock-out/create')
const detailBase = computed(() => isIn.value ? '/stock-in' : '/stock-out')
const source = computed(() => {
  const documents = isIn.value ? store.stockInDocuments : store.stockOutDocuments
  return store.isManager ? documents.filter(item => item.status === 'Chờ duyệt') : documents
})
const canCreateAndSubmit = computed(() => store.isAdmin || store.isStaff)
const columns = computed(() => [
  ...(canCreateAndSubmit.value ? [{ key: 'select', label: '' }] : []),
  { key: 'id', label: 'Mã phiếu' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'warehouse', label: 'Kho' },
  { key: 'partner', label: 'Đối tác' },
  { key: 'creator', label: 'Người tạo' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'submittedAt', label: 'Ngày gửi duyệt' },
  { key: 'actions', label: 'Thao tác' },
])
const rows = computed(() => source.value.filter(item =>
  `${item.id} ${item.partner} ${item.creator}`.toLowerCase().includes(q.value.toLowerCase()) &&
  (!warehouse.value || item.warehouse === warehouse.value) &&
  (!status.value || item.status === status.value)
))
const selectableRows = computed(() => canCreateAndSubmit.value ? rows.value.filter(row => isEditable(row)) : [])
const allSelectableChecked = computed(() =>
  selectableRows.value.length > 0 && selectableRows.value.every(row => selectedIds.value.includes(row.id))
)

watch([rows, () => props.type], () => {
  const visibleIds = new Set(rows.value.map(row => row.id))
  selectedIds.value = selectedIds.value.filter(id => visibleIds.has(id))
})

function isEditable(row) {
  return canCreateAndSubmit.value && editableStatuses.includes(row.status)
}

function canDelete(row) {
  return canCreateAndSubmit.value && row.status === 'Nháp'
}

function toggleAll(event) {
  if (event.target.checked) {
    selectedIds.value = [...new Set([...selectedIds.value, ...selectableRows.value.map(row => row.id)])]
    return
  }
  const selectableIds = new Set(selectableRows.value.map(row => row.id))
  selectedIds.value = selectedIds.value.filter(id => !selectableIds.has(id))
}

function submitSelected() {
  store.submitDocuments(selectedIds.value)
  selectedIds.value = []
}

function reject() {
  if (!rejectReason.value.trim()) return
  store.rejectDocument(rejectId.value, rejectReason.value)
  rejectId.value = ''
  rejectReason.value = ''
}
</script>

<template>
  <PageHeader :title="title" :description="`Quản lý danh sách ${title.toLowerCase()} theo workflow nháp, gửi duyệt và hoàn thành.`">
    <RouterLink v-if="canCreateAndSubmit" :to="createPath" class="btn btn-primary"><i class="mdi mdi-plus"></i>Tạo phiếu</RouterLink>
  </PageHeader>
  <SearchFilterBar v-model="q" placeholder="Tìm mã phiếu, đối tác hoặc người tạo">
    <select v-model="warehouse" class="select"><option value="">Tất cả kho</option><option v-for="item in warehouses" :key="item">{{ item }}</option></select>
    <select v-model="status" class="select"><option value="">Tất cả trạng thái</option><option v-for="item in documentStatuses" :key="item">{{ item }}</option></select>
  </SearchFilterBar>

  <div v-if="canCreateAndSubmit && selectedIds.length" class="bulk-bar card card-pad">
    <div>
      <strong>Đã chọn {{ selectedIds.length }} phiếu</strong>
      <span class="muted">Chỉ phiếu Nháp hoặc Từ chối mới được gửi duyệt hàng loạt.</span>
    </div>
    <div class="actions">
      <button class="btn" @click="selectedIds = []">Bỏ chọn</button>
      <button class="btn btn-primary" @click="submitSelected">Gửi duyệt {{ selectedIds.length }} phiếu</button>
    </div>
  </div>

  <DataTable :columns="columns" :rows="rows" :empty-text="store.isManager ? 'Không có phiếu chờ duyệt' : 'Chưa có phiếu'">
    <template #select="{ row }">
      <input
        v-if="isEditable(row)"
        v-model="selectedIds"
        class="checkbox"
        type="checkbox"
        :value="row.id"
        :aria-label="`Chọn ${row.id}`"
      />
      <span v-else class="muted">-</span>
    </template>
    <template #status="{ value }"><StatusBadge :status="value" /></template>
    <template #actions="{ row }">
      <div class="actions document-actions">
        <RouterLink :to="`${detailBase}/${row.id}`" class="btn btn-sm">Xem chi tiết</RouterLink>
        <RouterLink v-if="isEditable(row)" :to="`${detailBase}/${row.id}/edit`" class="btn btn-sm">Chỉnh sửa</RouterLink>
        <button v-if="isEditable(row)" class="btn btn-sm btn-primary" @click="store.submitDocument(row.id)">Gửi duyệt</button>
        <button v-if="canDelete(row)" class="btn btn-sm btn-danger" @click="store.cancelDocument(row.id)">Xóa</button>
        <button v-if="store.isManager && row.status === 'Chờ duyệt'" class="btn btn-sm btn-success" @click="store.approveDocument(row.id)">Chấp nhận</button>
        <button v-if="store.isManager && row.status === 'Chờ duyệt'" class="btn btn-sm btn-danger" @click="rejectId = row.id">Từ chối</button>
      </div>
    </template>
    <template #select-header>
      <input class="checkbox" type="checkbox" :checked="allSelectableChecked" @change="toggleAll" aria-label="Chọn tất cả phiếu có thể gửi duyệt" />
    </template>
  </DataTable>
  <ConfirmDialog :open="Boolean(rejectId)" title="Từ chối phiếu" message="Nhập lý do từ chối để nhân viên biết nội dung cần hiệu chỉnh." confirm-text="Từ chối" danger @cancel="rejectId = ''; rejectReason = ''" @confirm="reject">
    <textarea v-model="rejectReason" class="textarea" placeholder="Nhập lý do từ chối"></textarea>
  </ConfirmDialog>
</template>

<style scoped>
.bulk-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; border-color: #bfdbfe; background: #eff6ff; }
.bulk-bar span { display: block; margin-top: 2px; }
.checkbox { width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer; }
.document-actions { flex-wrap: nowrap; gap: 6px; min-width: max-content; }
.document-actions .btn { white-space: nowrap; min-height: 30px; padding: 5px 9px; }
</style>
