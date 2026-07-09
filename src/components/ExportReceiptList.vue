<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { getCurrentRoleCode } from '../services/authService'
import { getMyExportReceipts, getExportReceipts, cancelDraft, submitForApproval } from '../services/exportReceiptService'

const router = useRouter()
const receipts = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const actionMessage = ref('')
const actionErrorMessage = ref('')
const actionState = reactive({ receiptId: null, action: '' })
const confirmState = reactive({ open: false, action: '', receipt: null })
let fetchReceiptsRequestId = 0

const page = ref(0)
const size = ref(10)
const totalPages = ref(0)
const totalElements = ref(0)
const filters = reactive({ status: '' })

const hasPreviousPage = computed(() => page.value > 0)
const hasNextPage = computed(() => page.value + 1 < totalPages.value)
const currentRole = computed(() => getCurrentRoleCode())
const canCreateExportReceipt = computed(() => currentRole.value === 'ADMIN' || currentRole.value === 'EMPLOYEE')
const pageTitle = computed(() => currentRole.value === 'EMPLOYEE' ? 'Phiếu xuất của tôi' : 'Phiếu xuất kho')
const pageDescription = computed(() => currentRole.value === 'EMPLOYEE'
  ? 'Danh sách phiếu xuất kho do bạn tạo.'
  : 'Danh sách phiếu xuất kho toàn hệ thống.')

const columns = [
  { key: 'code', label: 'Mã phiếu' },
  { key: 'warehouseName', label: 'Kho xuất' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'actions', label: 'Thao tác' },
]

const statusOptions = [
  { value: 'NHAP', label: 'Nháp' },
  { value: 'CHO_DUYET_CAP_1', label: 'Chờ quản lý duyệt' },
  { value: 'CHO_DUYET_CAP_2', label: 'Chờ quản lý duyệt' },
  { value: 'HOAN_THANH', label: 'Hoàn thành' },
  { value: 'TU_CHOI', label: 'Từ chối' },
  { value: 'HUY', label: 'Hủy' },
]

const statusLabels = Object.fromEntries(statusOptions.map(status => [status.value, status.label]))

onMounted(() => {
  fetchReceipts()
})

// Logic: Gọi API lấy danh sách
async function fetchReceipts() {
  const requestId = ++fetchReceiptsRequestId
  isLoading.value = true
  errorMessage.value = ''
  actionMessage.value = ''
  actionErrorMessage.value = ''
  try {
    const listReceipts = currentRole.value === 'MANAGER' || currentRole.value === 'ADMIN'
      ? getExportReceipts
      : getMyExportReceipts
    const data = await listReceipts({
      page: page.value,
      size: size.value,
      status: filters.status,
    })
    if (requestId !== fetchReceiptsRequestId) return
    receipts.value = data.content || []
    totalPages.value = data.totalPages || 0
    totalElements.value = data.totalElements || 0
  } catch (error) {
    if (requestId !== fetchReceiptsRequestId) return
    receipts.value = []
    errorMessage.value = error.message
    if (error.status === 401) router.replace('/login')
  } finally {
    if (requestId !== fetchReceiptsRequestId) return
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

// Logic: Chuyển hướng
function goCreate() {
  if (!canCreateExportReceipt.value) return
  router.push('/stock-out/create')
}

function goEdit(receipt) {
  if (!canEditExportReceipt(receipt.status)) return
  router.push(`/stock-out/${receipt.id}/edit`)
}

function goDetail(receipt) {
  router.push(`/stock-out/${receipt.id}`)
}

// Logic: Các hàm xử lý click action
function handleSubmit(receipt) {
  if (!canSubmitExportReceipt(receipt.status)) return
  confirmState.open = true
  confirmState.action = 'submit'
  confirmState.receipt = receipt
}

function handleCancel(receipt) {
  if (!canCancelExportReceipt(receipt.status)) return
  confirmState.open = true
  confirmState.action = 'cancel'
  confirmState.receipt = receipt
}

function closeConfirmDialog() {
  confirmState.open = false
  confirmState.action = ''
  confirmState.receipt = null
}

// Logic: Modal Confirm trả về OK -> Gọi API
async function confirmAction() {
  const receipt = confirmState.receipt
  const action = confirmState.action
  if (!receipt) return
  closeConfirmDialog()

  if (action === 'submit') {
    await confirmSubmit(receipt)
  } else if (action === 'cancel') {
    await confirmCancel(receipt)
  }
}

// Logic: Gọi API Gửi duyệt (T118)
async function confirmSubmit(receipt) {
  actionState.receiptId = receipt.id
  actionState.action = 'submit'
  actionMessage.value = ''
  actionErrorMessage.value = ''

  try {
    // Truyền version lên để handle Optimistic Lock nếu cần
    await submitForApproval(receipt.id, { version: receipt.version })
    await fetchReceipts()
    actionMessage.value = 'Gửi duyệt phiếu xuất thành công.'
  } catch (error) {
    actionErrorMessage.value = error.message || 'Thao tác thất bại, vui lòng thử lại.'
    if (error.status === 401) router.replace('/login')
  } finally {
    actionState.receiptId = null
    actionState.action = ''
  }
}

// Logic: Gọi API Hủy phiếu nháp (T117)
async function confirmCancel(receipt) {
  actionState.receiptId = receipt.id
  actionState.action = 'cancel'
  actionMessage.value = ''
  actionErrorMessage.value = ''

  try {
    await cancelDraft(receipt.id)
    await fetchReceipts()
    actionMessage.value = 'Hủy phiếu xuất thành công.'
  } catch (error) {
    actionErrorMessage.value = error.message || 'Thao tác thất bại, vui lòng thử lại.'
    if (error.status === 401) router.replace('/login')
  } finally {
    actionState.receiptId = null
    actionState.action = ''
  }
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

// Style CSS class tùy theo trạng thái của hệ thống
function statusClass(status) {
  return `status-${String(status || 'unknown').toLowerCase().replaceAll('_', '-')}`
}

function hasRejectionReason(receipt) {
  return Boolean(String(receipt?.rejectionReason || '').trim())
}

function rejectionReasonText(receipt) {
  return hasRejectionReason(receipt)
    ? `Lý do từ chối: ${String(receipt.rejectionReason).trim()}`
    : 'Chưa có lý do từ chối.'
}

// Phân quyền hiển thị nút: Sửa, Gửi duyệt chỉ áp dụng cho Nhân viên, trạng thái NHÁP/TỪ CHỐI
function canEditExportReceipt(status) {
  if (!['ADMIN', 'EMPLOYEE'].includes(currentRole.value)) return false
  return status === 'NHAP' || status === 'TU_CHOI'
}

function canSubmitExportReceipt(status) {
  if (!['ADMIN', 'EMPLOYEE'].includes(currentRole.value)) return false
  return status === 'NHAP' || status === 'TU_CHOI'
}

function submitLabel(status) {
  return status === 'TU_CHOI' ? 'Gửi duyệt lại' : 'Gửi duyệt'
}

// Nút hủy chỉ áp dụng cho trạng thái NHÁP
function canCancelExportReceipt(status) {
  if (!['ADMIN', 'EMPLOYEE'].includes(currentRole.value)) return false
  return status === 'NHAP'
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function confirmTitle() {
  return confirmState.action === 'cancel' ? 'Xác nhận hủy' : 'Xác nhận gửi duyệt'
}

function confirmMessage() {
  return confirmState.action === 'cancel'
    ? 'Hủy phiếu xuất này? (Không thể hoàn tác)'
    : 'Gửi duyệt phiếu xuất này lên Quản lý?'
}

function confirmText() {
  return confirmState.action === 'cancel' ? 'Hủy phiếu' : 'Gửi duyệt'
}
</script>

<template>
  <PageHeader :title="pageTitle" :description="pageDescription">
    <button v-if="canCreateExportReceipt" class="btn btn-primary" type="button" @click="goCreate"><i class="mdi mdi-plus"></i>Tạo phiếu xuất</button>
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
  <p v-if="isLoading" class="muted loading-line">Đang tải danh sách phiếu xuất...</p>

  <DataTable :columns="columns" :rows="receipts" empty-text="Chưa có phiếu xuất từ backend">
    <template #warehouseName="{ value }">{{ value || '-' }}</template>
    <template #createdAt="{ value }">{{ formatDate(value) }}</template>
    <template #status="{ row, value }">
      <span class="badge" :class="statusClass(value)">{{ statusLabel(value) }}</span>
      <p v-if="value === 'TU_CHOI'" class="export-receipt-list__rejection-reason" style="font-size: 12px; color: #b91c1c; margin-top: 4px;">
        {{ rejectionReasonText(row) }}
      </p>
    </template>
    <template #actions="{ row }">
      <div class="actions">
        <button v-if="canEditExportReceipt(row.status)" class="btn btn-sm" type="button" :disabled="isAnyActionRunning(row)" @click="goEdit(row)">Sửa</button>
        <button v-if="canSubmitExportReceipt(row.status)" class="btn btn-sm" type="button" :disabled="isAnyActionRunning(row)" @click="handleSubmit(row)">
          {{ isActionRunning(row, 'submit') ? 'Đang gửi...' : submitLabel(row.status) }}
        </button>
        <button v-if="canCancelExportReceipt(row.status)" class="btn btn-sm" type="button" :disabled="isAnyActionRunning(row)" @click="handleCancel(row)">
          {{ isActionRunning(row, 'cancel') ? 'Đang hủy...' : 'Hủy' }}
        </button>
        <!-- Nút Xem chi tiết luôn hiện -->
        <button class="btn btn-sm" type="button" @click="goDetail(row)">Xem</button>
      </div>
    </template>
  </DataTable>

  <div class="pagination-bar card card-pad">
    <span class="muted">{{ totalElements }} phiếu xuất</span>
    <div class="pagination-actions">
      <button class="btn btn-sm" type="button" :disabled="!hasPreviousPage" @click="previousPage">Trước</button>
      <span class="page-indicator">Trang {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span>
      <button class="btn btn-sm" type="button" :disabled="!hasNextPage" @click="nextPage">Sau</button>
    </div>
  </div>

  <ConfirmDialog
    :open="confirmState.open"
    :title="confirmTitle()"
    :message="confirmMessage()"
    :confirm-text="confirmText()"
    :danger="confirmState.action === 'cancel'"
    @cancel="closeConfirmDialog"
    @confirm="confirmAction"
  />
</template>

<style scoped>
@import '../assets/styles/import-receipt-form.css';

.loading-line { margin: 8px 0 14px; }
.form-alert { margin: 0 0 12px; padding: 10px 12px; border-radius: 8px; line-height: 20px; }
.form-alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.form-alert-info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.actions .btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.actions .btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.actions .btn:active:not(:disabled) {
  transform: translateY(0);
}
.filter-bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
.badge { 
  display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 9px; 
  font-size: 12px; font-weight: 800; white-space: nowrap; 
  background: #f1f5f9; color: #475569; 
  transition: all 0.2s ease;
}
.badge:hover { filter: brightness(0.95); }
.status-nhap, .status-huy { background: #f1f5f9; color: #475569; }
.status-cho-duyet-cap-1, .status-cho-duyet-cap-2 { background: #fef3c7; color: #b45309; }
.status-tu-choi { background: #fee2e2; color: #b91c1c; }
.status-hoan-thanh { background: #dcfce7; color: #15803d; }
.pagination-bar { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pagination-actions { display: flex; align-items: center; gap: 10px; }
.page-indicator { color: var(--muted); font-weight: 600; }

@media (max-width: 640px) {
  .pagination-bar { align-items: flex-start; flex-direction: column; }
}
</style>
