<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import FeaturePending from '../components/FeaturePending.vue'
import DataTable from '../components/DataTable.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { cancelDraft, getMyImportReceipts, submitForApproval } from '../services/importReceiptService'

const props = defineProps({ type: { type: String, default: 'in' } })

const router = useRouter()
const receipts = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const actionMessage = ref('')
const actionErrorMessage = ref('')
const actionState = reactive({ receiptId: null, action: '' })
const page = ref(0)
const size = ref(10)
const totalPages = ref(0)
const totalElements = ref(0)
const filters = reactive({ status: '' })

const confirmState = reactive({
  open: false,
  title: 'Xác nhận',
  message: '',
  danger: false,
  onConfirm: null,
})

function triggerConfirm(title, message, danger, onConfirm) {
  confirmState.title = title
  confirmState.message = message
  confirmState.danger = danger
  confirmState.onConfirm = onConfirm
  confirmState.open = true
}

function executeConfirm() {
  confirmState.open = false
  if (confirmState.onConfirm) confirmState.onConfirm()
}

const hasPreviousPage = computed(() => page.value > 0)
const hasNextPage = computed(() => page.value + 1 < totalPages.value)

const columns = [
  { key: 'code', label: 'Mã phiếu' },
  { key: 'warehouseName', label: 'Kho' },
  { key: 'supplierName', label: 'Nhà cung cấp' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'totalAmount', label: 'Tổng tiền' },
  { key: 'actions', label: 'Thao tác' },
]

const statusOptions = [
  { value: 'NHAP', label: 'Nháp' },
  { value: 'CHO_DUYET_CAP_1', label: 'Chờ duyệt cấp 1' },
  { value: 'CHO_DUYET_CAP_2', label: 'Chờ duyệt cấp 2' },
  { value: 'CHO_HANG_VE', label: 'Chờ hàng về' },
  { value: 'CHO_KIEM_HANG', label: 'Chờ kiểm hàng' },
  { value: 'HOAN_THANH', label: 'Hoàn thành' },
  { value: 'TU_CHOI', label: 'Từ chối' },
  { value: 'HUY', label: 'Hủy' },
]

const statusLabels = Object.fromEntries(statusOptions.map(status => [status.value, status.label]))

onMounted(() => {
  if (props.type === 'in') fetchReceipts()
})

watch(() => props.type, type => {
  if (type === 'in') fetchReceipts()
})

async function fetchReceipts() {
  isLoading.value = true
  errorMessage.value = ''
  actionMessage.value = ''
  actionErrorMessage.value = ''
  try {
    const data = await getMyImportReceipts({
      page: page.value,
      size: size.value,
      status: filters.status,
    })
    receipts.value = data.content || []
    totalPages.value = data.totalPages || 0
    totalElements.value = data.totalElements || 0
  } catch (error) {
    receipts.value = []
    errorMessage.value = error.message
    if (error.status === 401) router.replace('/login')
  } finally {
    isLoading.value = false
  }
}

function applyFilter() {
  page.value = 0
  fetchReceipts()
}

function clearFilters() {
  filters.status = ''
  page.value = 0
  fetchReceipts()
}

function previousPage() {
  if (!hasPreviousPage.value) return
  page.value -= 1
  fetchReceipts()
}

function nextPage() {
  if (!hasNextPage.value) return
  page.value += 1
  fetchReceipts()
}

function goCreate() {
  router.push('/stock-in/create')
}

function goEdit(receipt) {
  router.push(`/stock-in/${receipt.id}/edit`)
}

function goDetail(receipt) {
  router.push(`/stock-in/${receipt.id}`)
}

async function handleSubmit(receipt) {
  if (!canSubmitImportReceipt(receipt.status)) return
  triggerConfirm(
    'Gửi duyệt phiếu',
    `Bạn có chắc chắn muốn gửi duyệt phiếu nhập ${receipt.code}?`,
    false,
    async () => {
      actionState.receiptId = receipt.id
      actionState.action = 'submit'
      actionMessage.value = ''
      actionErrorMessage.value = ''

      try {
        await submitForApproval(receipt.id)
        await fetchReceipts()
        actionMessage.value = 'Gửi duyệt phiếu nhập thành công.'
      } catch (error) {
        actionErrorMessage.value = error.message || 'Thao tác thất bại, vui lòng thử lại.'
        if (error.status === 401) router.replace('/login')
      } finally {
        actionState.receiptId = null
        actionState.action = ''
      }
    }
  )
}

async function handleCancel(receipt) {
  if (!canCancelImportReceipt(receipt.status)) return
  triggerConfirm(
    'Hủy phiếu nhập',
    `Bạn có chắc chắn muốn hủy phiếu nhập ${receipt.code}?`,
    true,
    async () => {
      actionState.receiptId = receipt.id
      actionState.action = 'cancel'
      actionMessage.value = ''
      actionErrorMessage.value = ''

      try {
        await cancelDraft(receipt.id)
        await fetchReceipts()
        actionMessage.value = 'Hủy phiếu nhập thành công.'
      } catch (error) {
        actionErrorMessage.value = error.message || 'Thao tác thất bại, vui lòng thử lại.'
        if (error.status === 401) router.replace('/login')
      } finally {
        actionState.receiptId = null
        actionState.action = ''
      }
    }
  )
}

function isActionRunning(receipt, action) {
  return actionState.receiptId === receipt.id && actionState.action === action
}

function isAnyActionRunning(receipt) {
  return actionState.receiptId === receipt.id
}

function statusLabel(status) {
  return statusLabels[status] || status || '-'
}

function statusClass(status) {
  return `status-${String(status || 'unknown').toLowerCase().replaceAll('_', '-')}`
}

function canEditImportReceipt(status) {
  return status === 'NHAP' || status === 'TU_CHOI'
}

function canSubmitImportReceipt(status) {
  return status === 'NHAP'
}

function canCancelImportReceipt(status) {
  return status === 'NHAP'
}

function hasWorkflowAction(status) {
  return canEditImportReceipt(status) || canSubmitImportReceipt(status) || canCancelImportReceipt(status)
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '-'
  return Number(value || 0).toLocaleString('vi-VN') + ' đ'
}
</script>

<template>
  <template v-if="type === 'in'">
    <PageHeader title="Phiếu nhập của tôi" description="Danh sách phiếu nhập kho do nhân viên tạo từ API backend.">
      <button class="btn btn-primary" type="button" @click="goCreate"><i class="mdi mdi-plus"></i>Tạo phiếu</button>
    </PageHeader>

    <div class="filter-bar card card-pad">
      <select v-model="filters.status" class="select" @change="applyFilter">
        <option value="">Tất cả trạng thái</option>
        <option v-for="status in statusOptions" :key="status.value" :value="status.value">{{ status.label }}</option>
      </select>
      <button class="btn btn-ghost" type="button" @click="clearFilters">Xóa lọc</button>
    </div>

    <p v-if="errorMessage" class="form-alert form-alert-error">{{ errorMessage }}</p>
    <p v-if="actionErrorMessage" class="form-alert form-alert-error">{{ actionErrorMessage }}</p>
    <p v-if="actionMessage" class="form-alert form-alert-info">{{ actionMessage }}</p>
    <p v-if="isLoading" class="muted loading-line">Đang tải danh sách phiếu nhập...</p>

    <DataTable :columns="columns" :rows="receipts" empty-text="Chưa có phiếu nhập từ backend">
      <template #warehouseName="{ value }">{{ value || '-' }}</template>
      <template #supplierName="{ value }">{{ value || '-' }}</template>
      <template #createdAt="{ value }">{{ formatDate(value) }}</template>
      <template #status="{ value }"><span class="badge" :class="statusClass(value)">{{ statusLabel(value) }}</span></template>
      <template #totalAmount="{ value }">{{ formatCurrency(value) }}</template>
      <template #actions="{ row }">
        <div class="actions">
          <button v-if="canEditImportReceipt(row.status)" class="btn btn-sm" type="button" :disabled="isAnyActionRunning(row)" @click="goEdit(row)">Sửa</button>
          <button v-if="canSubmitImportReceipt(row.status)" class="btn btn-sm" type="button" :disabled="isAnyActionRunning(row)" @click="handleSubmit(row)">
            {{ isActionRunning(row, 'submit') ? 'Đang gửi...' : 'Gửi duyệt' }}
          </button>
          <button v-if="canCancelImportReceipt(row.status)" class="btn btn-sm" type="button" :disabled="isAnyActionRunning(row)" @click="handleCancel(row)">
            {{ isActionRunning(row, 'cancel') ? 'Đang hủy...' : 'Hủy' }}
          </button>
          <button v-if="!hasWorkflowAction(row.status)" class="btn btn-sm" type="button" @click="goDetail(row)">Xem</button>
        </div>
      </template>
    </DataTable>

    <div class="pagination-bar card card-pad">
      <span class="muted">{{ totalElements }} phiếu nhập</span>
      <div class="pagination-actions">
        <button class="btn btn-sm" type="button" :disabled="!hasPreviousPage" @click="previousPage">Trước</button>
        <span class="page-indicator">Trang {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span>
        <button class="btn btn-sm" type="button" :disabled="!hasNextPage" @click="nextPage">Sau</button>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmState.open"
      :title="confirmState.title"
      :message="confirmState.message"
      :danger="confirmState.danger"
      @cancel="confirmState.open = false"
      @confirm="executeConfirm"
    />
  </template>

  <template v-else>
    <PageHeader title="Phiếu xuất kho" description="Danh sách chứng từ kho từ API backend." />
    <FeaturePending title="Chưa có API chứng từ kho" description="Không hiển thị phiếu nhập/xuất mô phỏng trong luồng production." />
  </template>
</template>

<style scoped>
.loading-line { margin: 8px 0 14px; }
.form-alert { margin: 0 0 12px; padding: 10px 12px; border-radius: 8px; line-height: 20px; }
.form-alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.form-alert-info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.actions { display: flex; gap: 6px; flex-wrap: nowrap; white-space: nowrap; }
.actions .btn { padding: 4px 8px; font-size: 12px; min-height: 28px; }
.filter-bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
.badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 9px; font-size: 12px; font-weight: 800; white-space: nowrap; background: #f1f5f9; color: #475569; }
.status-nhap, .status-huy { background: #f1f5f9; color: #475569; }
.status-cho-duyet-cap-1, .status-cho-duyet-cap-2, .status-cho-hang-ve, .status-cho-kiem-hang { background: #fef3c7; color: #b45309; }
.status-tu-choi { background: #fee2e2; color: #b91c1c; }
.status-hoan-thanh { background: #dcfce7; color: #15803d; }
.pagination-bar { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pagination-actions { display: flex; align-items: center; gap: 10px; }
.page-indicator { color: var(--muted); font-weight: 600; }

@media (max-width: 640px) {
  .pagination-bar { align-items: flex-start; flex-direction: column; }
}
</style>
