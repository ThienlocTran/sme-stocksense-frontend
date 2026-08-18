<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import StatusBadge from '../components/StatusBadge.vue'
import ImportReceiptHistoryModal from '../components/ImportReceiptHistoryModal.vue'
import { getCurrentRoleCode } from '../services/authService'
import { cancelDraft, getImportReceipts, getMyImportReceipts, submitForApproval } from '../services/importReceiptService'
import { cancelExportReceipt, getExportReceipts, getMyExportReceipts, submitExportReceipt } from '../services/exportReceiptService'

const props = defineProps({ type: { type: String, default: 'in' } })

const router = useRouter()
const receipts = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const actionMessage = ref('')
const actionErrorMessage = ref('')
const actionState = reactive({ receiptId: null, action: '' })
const confirmState = reactive({ open: false, action: '', receipt: null })
let fetchReceiptsRequestId = 0

// Modal Lịch sử duyệt
const historyState = reactive({ open: false, receiptId: null, receiptCode: '' })

function openHistory(receipt) {
  historyState.receiptId = receipt.id
  historyState.receiptCode = receipt.code
  historyState.open = true
}

function closeHistory() {
  historyState.open = false
  historyState.receiptId = null
  historyState.receiptCode = ''
}

const page = ref(0)
const size = ref(10)
const totalPages = ref(0)
const totalElements = ref(0)
const filters = reactive({ status: '' })

const hasPreviousPage = computed(() => page.value > 0)
const hasNextPage = computed(() => page.value + 1 < totalPages.value)
const currentRole = computed(() => getCurrentRoleCode())
const isOut = computed(() => props.type === 'out')
const canCreateImportReceipt = computed(() => currentRole.value === 'ADMIN' || currentRole.value === 'EMPLOYEE')
const pageTitle = computed(() => `${isOut.value ? 'Phiếu xuất' : 'Phiếu nhập'}${currentRole.value === 'EMPLOYEE' ? ' của tôi' : ' kho'}`)
const pageDescription = computed(() => `Danh sách phiếu ${isOut.value ? 'xuất' : 'nhập'} kho từ hệ thống.`)

const columns = computed(() => [
  { key: 'code', label: 'Mã phiếu' },
  { key: 'warehouseName', label: 'Kho' },
  { key: isOut.value ? 'partnerName' : 'supplierName', label: isOut.value ? 'Đối tác' : 'Nhà cung cấp' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'totalAmount', label: 'Tổng tiền' },
  { key: 'actions', label: 'Thao tác' },
])

const statusOptions = [
  { value: 'NHAP', label: 'Nháp' },
  { value: 'CHO_DUYET', label: 'Chờ duyệt' },
  { value: 'CHO_DUYET_CAP_1', label: 'Chờ duyệt' },
  { value: 'CHO_DUYET_CAP_2', label: 'Chờ duyệt' },
  { value: 'DA_DUYET', label: 'Đã duyệt' },
  { value: 'CHO_HANG_VE', label: 'Chờ hàng về' },
  { value: 'CHO_KIEM_HANG', label: 'Chờ kiểm hàng' },
  { value: 'HOAN_THANH', label: 'Hoàn thành' },
  { value: 'TU_CHOI', label: 'Từ chối' },
  { value: 'HUY', label: 'Hủy' },
]

const statusLabels = {
  ...Object.fromEntries(statusOptions.map(status => [status.value, status.label])),
}

const statusHelpers = {
  NHAP: 'Bản nháp - chưa gửi phê duyệt.',
  CHO_DUYET: 'Đang chờ người có thẩm quyền phê duyệt.',
  CHO_DUYET_CAP_1: 'Chờ duyệt cấp 1 - đang chờ xử lý.',
  CHO_DUYET_CAP_2: 'Chờ duyệt cấp 2 - chờ quản lý cấp cao.',
  DA_DUYET: 'Đã duyệt - phiếu được chấp nhận, chờ xử lý kho.',
  CHO_HANG_VE: 'Chờ hàng về - phiếu đã duyệt, chờ giao hàng.',
  CHO_KIEM_HANG: 'Chờ kiểm hàng - vui lòng kiểm kê thực tế.',
  HOAN_THANH: 'Hoàn thành - hàng đã nhập/xuất kho thành công.',
  TU_CHOI: 'Từ chối - vui lòng kiểm tra lý do và chỉnh sửa.',
  HUY: 'Đã hủy - phiếu không còn hiệu lực.',
}

onMounted(() => {
  fetchReceipts()
  window.addEventListener('click', handleWindowClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleWindowClick)
})

watch(() => props.type, () => { page.value = 0; fetchReceipts() })

async function fetchReceipts() {
  const requestId = ++fetchReceiptsRequestId
  isLoading.value = true
  errorMessage.value = ''
  actionMessage.value = ''
  actionErrorMessage.value = ''
  try {
    const privileged = currentRole.value === 'MANAGER' || currentRole.value === 'ADMIN'
    const listReceipts = isOut.value
      ? (privileged ? getExportReceipts : getMyExportReceipts)
      : (privileged ? getImportReceipts : getMyImportReceipts)
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

function goCreate() {
  if (!canCreateImportReceipt.value) return
  router.push(`${isOut.value ? '/stock-out' : '/stock-in'}/create`)
}

function goEdit(receipt) {
  if (!canEditImportReceipt(receipt.status)) return
  router.push(`${isOut.value ? '/stock-out' : '/stock-in'}/${receipt.id}/edit`)
}

function goDetail(receipt) {
  router.push(`${isOut.value ? '/stock-out' : '/stock-in'}/${receipt.id}`)
}

// Action dropdown toggle
const activeActionMenuRowId = ref(null)
function toggleActionMenu(rowId) {
  activeActionMenuRowId.value = activeActionMenuRowId.value === rowId ? null : rowId
}
function closeActionMenu() {
  activeActionMenuRowId.value = null
}
function handleWindowClick(event) {
  if (!event.target.closest('.dropdown-wrapper')) {
    closeActionMenu()
  }
}

function handleSubmit(receipt) {
  if (!canSubmitImportReceipt(receipt.status)) return
  confirmState.open = true
  confirmState.action = 'submit'
  confirmState.receipt = receipt
}

function handleCancel(receipt) {
  if (!canCancelImportReceipt(receipt.status)) return
  confirmState.open = true
  confirmState.action = 'cancel'
  confirmState.receipt = receipt
}

function closeConfirmDialog() {
  confirmState.open = false
  confirmState.action = ''
  confirmState.receipt = null
}

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

async function confirmSubmit(receipt) {
  actionState.receiptId = receipt.id
  actionState.action = 'submit'
  actionMessage.value = ''
  actionErrorMessage.value = ''

  try {
    if (isOut.value) await submitExportReceipt(receipt.id, receipt.version)
    else await submitForApproval(receipt.id)
    await fetchReceipts()
    actionMessage.value = 'Gửi duyệt thành công.'
  } catch (error) {
    actionErrorMessage.value = error.message || 'Thao tác thất bại, vui lòng thử lại.'
    if (error.status === 401) router.replace('/login')
  } finally {
    actionState.receiptId = null
    actionState.action = ''
  }
}

async function confirmCancel(receipt) {
  actionState.receiptId = receipt.id
  actionState.action = 'cancel'
  actionMessage.value = ''
  actionErrorMessage.value = ''

  try {
    if (isOut.value) await cancelExportReceipt(receipt.id)
    else await cancelDraft(receipt.id)
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

function isActionRunning(receipt, action) {
  return actionState.receiptId === receipt.id && actionState.action === action
}

// Check action loading without specifying action type
function isAnyActionRunning(receipt) {
  return actionState.receiptId === receipt.id
}

function statusLabel(status) {
  return statusLabels[status] || status || '-'
}

function hasRejectionReason(receipt) {
  return Boolean(String(receipt?.rejectionReason || '').trim())
}

function rejectionReasonText(receipt) {
  return hasRejectionReason(receipt)
    ? `Lý do từ chối: ${String(receipt.rejectionReason).trim()}`
    : 'Chưa có lý do từ chối.'
}

function canEditImportReceipt(status) {
  if (!['ADMIN', 'EMPLOYEE'].includes(currentRole.value)) return false
  return status === 'NHAP' || status === 'TU_CHOI'
}

function canSubmitImportReceipt(status) {
  if (!['ADMIN', 'EMPLOYEE'].includes(currentRole.value)) return false
  return status === 'NHAP' || status === 'TU_CHOI'
}

// Map TU_CHOI to 'Gửi duyệt lại' or 'Gửi duyệt'
function submitLabel(status) {
  return status === 'TU_CHOI' ? 'Gửi duyệt lại' : 'Gửi duyệt'
}

function canCancelImportReceipt(status) {
  if (!['ADMIN', 'EMPLOYEE'].includes(currentRole.value)) return false
  return status === 'NHAP'
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '-'
  return Number(value || 0).toLocaleString('vi-VN') + ' ₫'
}

function confirmTitle() {
  return confirmState.action === 'cancel' ? 'Xác nhận hủy' : 'Xác nhận gửi duyệt'
}

function confirmMessage() {
  return confirmState.action === 'cancel'
    ? `Hủy phiếu ${isOut.value ? 'xuất' : 'nhập'} này?`
    : `Gửi duyệt phiếu ${isOut.value ? 'xuất' : 'nhập'} này?`
}

function confirmText() {
  return confirmState.action === 'cancel' ? 'Hủy phiếu' : 'Gửi duyệt'
}
</script>

<template>
  <PageHeader :title="pageTitle" :description="pageDescription">
    <button v-if="canCreateImportReceipt" class="btn btn-primary" type="button" @click="goCreate">
      <i class="mdi" :class="isOut ? 'mdi-tray-arrow-up' : 'mdi-tray-arrow-down'"></i> Tạo phiếu
    </button>
  </PageHeader>

  <div class="filter-bar card card-pad">
    <div class="flex items-center gap-3">
      <select v-model="filters.status" class="select max-w-xs" @change="applyFilter">
        <option value="">Tất cả trạng thái</option>
        <option v-for="status in statusOptions" :key="status.value" :value="status.value">{{ status.label }}</option>
      </select>
      <button class="btn btn-ghost" type="button" @click="clearFilters">Xóa lọc</button>
    </div>
  </div>

  <p v-if="errorMessage" class="form-alert form-alert-error">{{ errorMessage }}</p>
  <p v-if="actionErrorMessage" class="form-alert form-alert-error">{{ actionErrorMessage }}</p>
  <p v-if="actionMessage" class="form-alert form-alert-info">{{ actionMessage }}</p>
  <p v-if="isLoading" class="muted loading-line">Đang tải danh sách phiếu...</p>

  <!-- Desktop Table view -->
  <div class="hidden md:block">
    <DataTable :columns="columns" :rows="receipts" :empty-text="`Chưa có phiếu ${isOut ? 'xuất' : 'nhập'} kho.`">
      <template #warehouseName="{ value }">{{ value || '-' }}</template>
      <template #supplierName="{ value }">{{ value || '-' }}</template>
      <template #partnerName="{ value }">{{ value || '-' }}</template>
      <template #createdAt="{ value }">{{ formatDate(value) }}</template>
      <template #status="{ row, value }">
        <div class="status-cell-wrapper">
          <StatusBadge :status="statusLabel(value)" />
          <span class="status-helper-text mt-1">{{ statusHelpers[value] }}</span>
          <p v-if="value === 'TU_CHOI'" class="import-receipt-list__rejection-reason mt-1">
            {{ rejectionReasonText(row) }}
          </p>
        </div>
      </template>
      <template #totalAmount="{ value }">{{ formatCurrency(value) }}</template>
      <template #actions="{ row }">
        <div class="action-dropdown-container">
          <button class="btn btn-sm btn-secondary" type="button" @click="goDetail(row)">Xem</button>
          
          <div class="dropdown-wrapper">
            <button 
              class="btn btn-sm btn-icon" 
              type="button" 
              :disabled="isAnyActionRunning(row)"
              @click.stop="toggleActionMenu(row.id)"
            >
              <i class="mdi mdi-dots-horizontal"></i>
            </button>
            
            <div v-if="activeActionMenuRowId === row.id" class="dropdown-menu">
              <button 
                v-if="canEditImportReceipt(row.status)" 
                class="dropdown-item" 
                type="button" 
                :disabled="isAnyActionRunning(row)" 
                @click="goEdit(row); closeActionMenu()"
              >
                <i class="mdi mdi-pencil-outline"></i> Sửa
              </button>
              <button 
                v-if="canSubmitImportReceipt(row.status)" 
                class="dropdown-item" 
                type="button" 
                :disabled="isAnyActionRunning(row)" 
                @click="handleSubmit(row); closeActionMenu()"
              >
                <i class="mdi mdi-send-outline"></i> {{ submitLabel(row.status) }}
              </button>
              <button 
                v-if="canCancelImportReceipt(row.status)" 
                class="dropdown-item" 
                type="button" 
                :disabled="isAnyActionRunning(row)" 
                @click="handleCancel(row); closeActionMenu()"
              >
                <i class="mdi mdi-cancel"></i> Hủy
              </button>
              <button 
                class="dropdown-item" 
                type="button" 
                :disabled="isAnyActionRunning(row)" 
                @click="openHistory(row); closeActionMenu()"
              >
                <i class="mdi mdi-history"></i> Lịch sử
              </button>
            </div>
          </div>
        </div>
      </template>
    </DataTable>
  </div>

  <!-- Mobile Responsive cards list -->
  <div class="block md:hidden space-y-4">
    <div v-if="receipts.length === 0" class="card card-pad text-center muted py-8">
      Chưa có phiếu {{ isOut ? 'xuất' : 'nhập' }} nào phù hợp với bộ lọc.
    </div>
    <div v-else v-for="row in receipts" :key="row.id" class="card card-pad relative space-y-3">
      <div class="between">
        <button class="text-link font-bold text-base text-primary" type="button" @click="goDetail(row)">
          {{ row.code }}
        </button>
        <StatusBadge :status="statusLabel(row.status)" />
      </div>
      
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span class="text-muted block text-xs uppercase font-semibold">Kho</span>
          <span class="font-medium text-text">{{ row.warehouseName || '-' }}</span>
        </div>
        <div>
          <span class="text-muted block text-xs uppercase font-semibold">
            {{ isOut ? 'Đối tác' : 'Nhà cung cấp' }}
          </span>
          <span class="font-medium text-text">
            {{ isOut ? row.partnerName : row.supplierName || '-' }}
          </span>
        </div>
        <div>
          <span class="text-muted block text-xs uppercase font-semibold">Ngày tạo</span>
          <span class="font-medium text-text">{{ formatDate(row.createdAt) }}</span>
        </div>
        <div>
          <span class="text-muted block text-xs uppercase font-semibold">Tổng tiền</span>
          <span class="font-bold text-danger">{{ formatCurrency(row.totalAmount) }}</span>
        </div>
      </div>

      <div class="text-xs text-slate-500 mt-1 italic">
        {{ statusHelpers[row.status] }}
      </div>

      <div v-if="row.status === 'TU_CHOI'" class="import-receipt-list__rejection-reason text-xs bg-red-50 p-2 rounded text-red-700">
        {{ rejectionReasonText(row) }}
      </div>

      <div class="border-t border-gray-100 pt-3 flex justify-end gap-2">
        <button class="btn btn-sm btn-secondary" type="button" @click="goDetail(row)">Xem</button>
        <button v-if="canEditImportReceipt(row.status)" class="btn btn-sm btn-secondary" type="button" :disabled="isAnyActionRunning(row)" @click="goEdit(row)">
          Sửa
        </button>
        <button v-if="canSubmitImportReceipt(row.status)" class="btn btn-sm btn-primary" type="button" :disabled="isAnyActionRunning(row)" @click="handleSubmit(row)">
          {{ isActionRunning(row, 'submit') ? 'Đang gửi...' : submitLabel(row.status) }}
        </button>
        <button v-if="canCancelImportReceipt(row.status)" class="btn btn-sm btn-danger" type="button" :disabled="isAnyActionRunning(row)" @click="handleCancel(row)">
          Hủy
        </button>
        <button class="btn btn-sm btn-secondary" type="button" :disabled="isAnyActionRunning(row)" @click="openHistory(row)">
          Lịch sử
        </button>
      </div>
    </div>
  </div>

  <div class="pagination-bar card card-pad">
    <span class="muted">{{ totalElements }} phiếu {{ isOut ? 'xuất' : 'nhập' }}</span>
    <div class="pagination-actions">
      <button class="btn btn-sm" type="button" :disabled="!hasPreviousPage" @click="previousPage">Trước</button>
      <span class="page-indicator">Trang {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span>
      <button class="btn btn-sm" type="button" :disabled="!hasNextPage" @click="nextPage">Sau</button>
    </div>
  </div>

  <!-- Modal Lịch sử duyệt -->
  <ImportReceiptHistoryModal
    v-if="historyState.open"
    :receipt-id="historyState.receiptId"
    :receipt-code="historyState.receiptCode"
    :document-type="type"
    @close="closeHistory"
  />

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
.pagination-bar { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pagination-actions { display: flex; align-items: center; gap: 10px; }
.page-indicator { color: var(--muted); font-weight: 600; }

.status-cell-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.status-helper-text {
  font-size: 11px;
  color: var(--color-text-secondary);
  line-height: 1.2;
}

.action-dropdown-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dropdown-wrapper {
  position: relative;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 50;
  min-width: 160px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dropdown-item {
  width: 100%;
  padding: 10px 14px;
  font-size: 13px;
  text-align: left;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-primary);
  transition: background-color 150ms ease;
  cursor: pointer;
}

.dropdown-item:hover:not(:disabled) {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.text-link {
  background: none;
  border: none;
  padding: 0;
  font-weight: 700;
  cursor: pointer;
}
.text-link:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .pagination-bar { align-items: flex-start; flex-direction: column; }
}
</style>
