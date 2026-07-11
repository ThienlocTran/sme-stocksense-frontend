<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import EmptyState from '../components/EmptyState.vue'
import { getPendingExportApprovals } from '../services/exportReceiptService'

const router = useRouter()

const rows = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const page = ref(0)
const size = ref(10)
const totalPages = ref(0)
const totalElements = ref(0)

const hasPreviousPage = computed(() => page.value > 0)
const hasNextPage = computed(() => page.value + 1 < totalPages.value)

const columns = [
  { key: 'code', label: 'Mã phiếu' },
  { key: 'createdByName', label: 'Người tạo' },
  { key: 'warehouseName', label: 'Kho xuất' },
  { key: 'submittedAt', label: 'Ngày gửi' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'approvalLevel', label: 'Cấp duyệt' },
]

onMounted(fetchPendingApprovals)

async function fetchPendingApprovals() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const data = await getPendingExportApprovals({ page: page.value, size: size.value })
    rows.value = data.content || []
    totalPages.value = data.totalPages || 0
    totalElements.value = data.totalElements || 0
  } catch (error) {
    rows.value = []
    errorMessage.value = error.message || 'Không thể tải danh sách phiếu xuất.'
    if (error.status === 401) router.replace('/login')
  } finally {
    isLoading.value = false
  }
}

function previousPage() {
  if (!hasPreviousPage.value) return
  page.value -= 1
  fetchPendingApprovals()
}

function nextPage() {
  if (!hasNextPage.value) return
  page.value += 1
  fetchPendingApprovals()
}

function goDetail(row) {
  router.push(`/stock-out/${row.id}`)
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}
</script>

<template>
  <PageHeader title="Phiếu xuất chờ duyệt" description="Danh sách phiếu xuất đang chờ quản lý kho xem xét." />

  <div class="toolbar card card-pad">
    <span class="muted">{{ totalElements }} phiếu đang chờ duyệt</span>
  </div>

  <p v-if="isLoading" class="loading-line muted">Đang tải danh sách phiếu xuất...</p>
  <p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>

  <template v-if="!isLoading && !errorMessage">
    <DataTable v-if="rows.length" :columns="columns" :rows="rows" empty-text="Không có phiếu xuất nào đang chờ duyệt">
      <template #code="{ row }">
        <button class="link-btn" type="button" @click="goDetail(row)">{{ row.code }}</button>
      </template>
      <template #createdByName="{ value }">{{ value || '-' }}</template>
      <template #warehouseName="{ value }">{{ value || '-' }}</template>
      <template #submittedAt="{ value }">{{ formatDate(value) }}</template>
      <template #status="{ value }">
        <span class="badge status-pending">{{ value || 'Chờ duyệt' }}</span>
      </template>
      <template #approvalLevel="{ value }">{{ value || '-' }}</template>
    </DataTable>

    <EmptyState v-else title="Chưa có phiếu xuất chờ duyệt" description="Hiện tại không có phiếu xuất nào cần xem xét." />
  </template>

  <div v-if="!isLoading && rows.length" class="pagination-bar card card-pad">
    <span class="muted">Trang {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span>
    <div class="pagination-actions">
      <button class="btn btn-sm" type="button" :disabled="!hasPreviousPage" @click="previousPage">Trước</button>
      <button class="btn btn-sm" type="button" :disabled="!hasNextPage" @click="nextPage">Sau</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.loading-line { margin: 0 0 14px; }
.error-message { margin: 0 0 14px; padding: 10px 12px; border-radius: 8px; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.link-btn { background: none; border: 0; padding: 0; color: var(--primary); font-weight: 700; text-align: left; }
.badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 9px; font-size: 12px; font-weight: 800; white-space: nowrap; background: #fef3c7; color: #b45309; }
.pagination-bar { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pagination-actions { display: flex; align-items: center; gap: 10px; }

@media (max-width: 640px) {
  .toolbar, .pagination-bar { align-items: flex-start; flex-direction: column; }
}
</style>
