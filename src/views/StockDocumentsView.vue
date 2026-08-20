<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import StatusBadge from '../components/StatusBadge.vue'
import ImportReceiptHistoryModal from '../components/ImportReceiptHistoryModal.vue'
import { getCurrentRoleCode, getCurrentUser } from '../services/authService'
import { canCreateImportReceipt, canCreateExportReceipt } from '../services/permissionService'
import { cancelDraft, cancelLateImportReceipt, getImportReceipts, getMyImportReceipts, submitForApproval } from '../services/importReceiptService'
import { cancelExportReceipt, cancelLateExportReceipt, getExportReceipts, getMyExportReceipts, submitExportReceipt } from '../services/exportReceiptService'

const props = defineProps({ type: { type: String, default: 'in' } })

const router = useRouter()
const { t } = useI18n()
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
const canCreateReceipt = computed(() => isOut.value ? canCreateExportReceipt() : canCreateImportReceipt())
const pageTitle = computed(() => {
  const baseKey = isOut.value ? 'export' : 'import'
  const roleKey = currentRole.value === 'EMPLOYEE' ? 'My' : 'All'
  return t(`stockDocument.title.${baseKey}.${roleKey}`)
})
const pageDescription = computed(() => {
  return t(`stockDocument.desc.${isOut.value ? 'export' : 'import'}`)
})

const columns = computed(() => [
  { key: 'code', label: t('stockDocument.columns.code') },
  { key: 'warehouseName', label: t('stockDocument.columns.warehouse') },
  { key: isOut.value ? 'partnerName' : 'supplierName', label: isOut.value ? t('stockDocument.columns.partner') : t('stockDocument.columns.supplier') },
  { key: 'createdAt', label: t('stockDocument.columns.createdAt') },
  { key: 'status', label: t('stockDocument.columns.status') },
  { key: 'totalAmount', label: t('stockDocument.columns.totalAmount') },
  { key: 'actions', label: t('stockDocument.columns.actions') },
])

const statusOptions = computed(() => {
  if (isOut.value) {
    return [
      { value: 'NHAP', label: t('stockDocument.status.draft') },
      { value: 'CHO_DUYET', label: t('stockDocument.status.pending') },
      { value: 'DA_DUYET', label: t('stockDocument.status.approved') },
      { value: 'HOAN_THANH', label: t('stockDocument.status.completed') },
      { value: 'TU_CHOI', label: t('stockDocument.status.rejected') },
      { value: 'HUY', label: t('stockDocument.status.cancelled') },
    ]
  } else {
    return [
      { value: 'NHAP', label: t('stockDocument.status.draft') },
      { value: 'CHO_DUYET_CAP_1', label: t('stockDocument.status.pending_level1') },
      { value: 'CHO_DUYET_CAP_2', label: t('stockDocument.status.pending_level2') },
      { value: 'CHO_HANG_VE', label: t('stockDocument.status.pending_delivery') },
      { value: 'CHO_KIEM_HANG', label: t('stockDocument.status.pending_inspection') },
      { value: 'HOAN_THANH', label: t('stockDocument.status.completed') },
      { value: 'TU_CHOI', label: t('stockDocument.status.rejected') },
      { value: 'HUY', label: t('stockDocument.status.cancelled') },
    ]
  }
})

const statusHelpers = computed(() => ({
  NHAP: t('stockDocument.statusDesc.draft'),
  CHO_DUYET: t('stockDocument.statusDesc.pending'),
  CHO_DUYET_CAP_1: t('stockDocument.statusDesc.pending_level1'),
  CHO_DUYET_CAP_2: t('stockDocument.statusDesc.pending_level2'),
  DA_DUYET: t('stockDocument.statusDesc.approved'),
  CHO_HANG_VE: t('stockDocument.statusDesc.pending_delivery'),
  CHO_KIEM_HANG: t('stockDocument.statusDesc.pending_inspection'),
  HOAN_THANH: t('stockDocument.statusDesc.completed'),
  TU_CHOI: t('stockDocument.statusDesc.rejected'),
  HUY: t('stockDocument.statusDesc.cancelled'),
}))

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
  if (!canCreateReceipt.value) return
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
  if (!canCancelReceipt(receipt)) return
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
    actionMessage.value = t('stockDocument.actionMessages.submitSuccess')
  } catch (error) {
    actionErrorMessage.value = error.message || t('stockDocument.actionMessages.actionFailed')
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
    if (isOut.value) {
      if (receipt.status === 'DA_DUYET') {
        await cancelLateExportReceipt(receipt.id, t('stockDocument.actionMessages.cancelExport'))
      } else {
        await cancelExportReceipt(receipt.id)
      }
    } else {
      if (receipt.status === 'CHO_HANG_VE' || receipt.status === 'CHO_KIEM_HANG') {
        await cancelLateImportReceipt(receipt.id, t('stockDocument.actionMessages.cancelImport'))
      } else {
        await cancelDraft(receipt.id)
      }
    }
    await fetchReceipts()
    actionMessage.value = t('stockDocument.actionMessages.cancelSuccess', { type: isOut.value ? t('stockDocument.typeOut') : t('stockDocument.typeIn') })
  } catch (error) {
    actionErrorMessage.value = error.message || t('stockDocument.actionMessages.actionFailed')
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
  const mapping = {
    NHAP: t('stockDocument.status.draft'),
    CHO_DUYET: t('stockDocument.status.pending'),
    CHO_DUYET_CAP_1: t('stockDocument.status.pending_level1'),
    CHO_DUYET_CAP_2: t('stockDocument.status.pending_level2'),
    DA_DUYET: t('stockDocument.status.approved'),
    CHO_HANG_VE: t('stockDocument.status.pending_delivery'),
    CHO_KIEM_HANG: t('stockDocument.status.pending_inspection'),
    HOAN_THANH: t('stockDocument.status.completed'),
    TU_CHOI: t('stockDocument.status.rejected'),
    HUY: t('stockDocument.status.cancelled'),
  }
  return mapping[status] || status || '-'
}

function hasRejectionReason(receipt) {
  return Boolean(String(receipt?.rejectionReason || '').trim())
}

function rejectionReasonText(receipt) {
  return hasRejectionReason(receipt)
    ? `${t('stockDocument.rejectionReason')}: ${String(receipt.rejectionReason).trim()}`
    : t('stockDocument.noRejectionReason')
}

function canEditImportReceipt(status) {
  if (!['ADMIN', 'EMPLOYEE'].includes(currentRole.value)) return false
  return status === 'NHAP' || status === 'TU_CHOI'
}

function canSubmitImportReceipt(status) {
  if (!['ADMIN', 'EMPLOYEE'].includes(currentRole.value)) return false
  return status === 'NHAP' || status === 'TU_CHOI'
}

function submitLabel(status) {
  return status === 'TU_CHOI' ? t('stockDocument.actionResubmit') : t('stockDocument.actionSubmit')
}

function canCancelReceipt(row) {
  const role = currentRole.value
  const status = row.status
  const currentUser = getCurrentUser()
  const isReceiptOut = isOut.value

  if (status === 'NHAP') {
    if (role === 'ADMIN') return true
    if (role === 'EMPLOYEE') {
      if (!currentUser) return true
      const creatorName = row.createdByName || row.createdBy
      if (creatorName && creatorName !== currentUser.fullName && creatorName !== currentUser.email) {
        return false
      }
      return true
    }
    return false
  }

  // Late stage cancellation
  if (isReceiptOut) {
    if (status === 'DA_DUYET') {
      return ['ADMIN', 'MANAGER'].includes(role)
    }
  } else {
    if (status === 'CHO_HANG_VE' || status === 'CHO_KIEM_HANG') {
      return ['ADMIN', 'MANAGER'].includes(role)
    }
  }

  return false
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
  return confirmState.action === 'cancel' ? t('stockDocument.confirmCancelTitle') : t('stockDocument.confirmSubmitTitle')
}

function confirmMessage() {
  const typeStr = isOut.value ? t('stockDocument.typeOut') : t('stockDocument.typeIn')
  return confirmState.action === 'cancel'
    ? t('stockDocument.confirmCancelMsg', { type: typeStr })
    : t('stockDocument.confirmSubmitMsg', { type: typeStr })
}

function confirmText() {
  return confirmState.action === 'cancel' ? t('stockDocument.actionCancel') : t('stockDocument.actionSubmit')
}
</script>

<template>
  <PageHeader :title="pageTitle" :description="pageDescription">
    <button v-if="canCreateReceipt" class="btn btn-primary" type="button" @click="goCreate">
      <i class="mdi" :class="isOut ? 'mdi-tray-arrow-up' : 'mdi-tray-arrow-down'"></i> {{ isOut ? t('stockDocument.createOut') : t('stockDocument.createIn') }}
    </button>
  </PageHeader>

  <div class="filter-bar card card-pad">
    <div class="flex items-center gap-3">
      <select v-model="filters.status" class="select max-w-xs" @change="applyFilter">
        <option value="">{{ t('stockDocument.allStatuses') }}</option>
        <option v-for="status in statusOptions" :key="status.value" :value="status.value">{{ status.label }}</option>
      </select>
      <button class="btn btn-ghost" type="button" @click="clearFilters">{{ t('stockDocument.clearFilters') }}</button>
    </div>
  </div>

  <p v-if="errorMessage" class="form-alert form-alert-error">{{ errorMessage }}</p>
  <p v-if="actionErrorMessage" class="form-alert form-alert-error">{{ actionErrorMessage }}</p>
  <p v-if="actionMessage" class="form-alert form-alert-info">{{ actionMessage }}</p>
  <p v-if="isLoading" class="muted loading-line">{{ t('stockDocument.loadingList') }}</p>

  <!-- Desktop Table view -->
  <div class="hidden md:block">
    <DataTable :columns="columns" :rows="receipts" :empty-text="isOut ? t('stockDocument.emptyOut') : t('stockDocument.emptyIn')">
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
          <button class="btn btn-sm btn-secondary" type="button" @click="goDetail(row)">{{ t('stockDocument.actionView') }}</button>
          
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
                <i class="mdi mdi-pencil-outline"></i> {{ t('stockDocument.actionEdit') }}
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
                v-if="canCancelReceipt(row)" 
                class="dropdown-item" 
                type="button" 
                :disabled="isAnyActionRunning(row)" 
                @click="handleCancel(row); closeActionMenu()"
              >
                <i class="mdi mdi-cancel"></i> {{ t('stockDocument.actionCancel') }}
              </button>
              <button 
                class="dropdown-item" 
                type="button" 
                :disabled="isAnyActionRunning(row)" 
                @click="openHistory(row); closeActionMenu()"
              >
                <i class="mdi mdi-history"></i> {{ t('stockDocument.actionHistory') }}
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
      {{ isOut ? t('stockDocument.emptyOutFilter') : t('stockDocument.emptyInFilter') }}
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
          <span class="text-muted block text-xs uppercase font-semibold">{{ t('stockDocument.columns.warehouse') }}</span>
          <span class="font-medium text-text">{{ row.warehouseName || '-' }}</span>
        </div>
        <div>
          <span class="text-muted block text-xs uppercase font-semibold">
            {{ isOut ? t('stockDocument.columns.partner') : t('stockDocument.columns.supplier') }}
          </span>
          <span class="font-medium text-text">
            {{ isOut ? row.partnerName : row.supplierName || '-' }}
          </span>
        </div>
        <div>
          <span class="text-muted block text-xs uppercase font-semibold">{{ t('stockDocument.columns.createdAt') }}</span>
          <span class="font-medium text-text">{{ formatDate(row.createdAt) }}</span>
        </div>
        <div>
          <span class="text-muted block text-xs uppercase font-semibold">{{ t('stockDocument.columns.totalAmount') }}</span>
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
        <button class="btn btn-sm btn-secondary" type="button" @click="goDetail(row)">{{ t('stockDocument.actionView') }}</button>
        <button v-if="canEditImportReceipt(row.status)" class="btn btn-sm btn-secondary" type="button" :disabled="isAnyActionRunning(row)" @click="goEdit(row)">
          {{ t('stockDocument.actionEdit') }}
        </button>
        <button v-if="canSubmitImportReceipt(row.status)" class="btn btn-sm btn-primary" type="button" :disabled="isAnyActionRunning(row)" @click="handleSubmit(row)">
          {{ isActionRunning(row, 'submit') ? t('stockDocument.actionSubmitting') : submitLabel(row.status) }}
        </button>
        <button v-if="canCancelReceipt(row)" class="btn btn-sm btn-danger" type="button" :disabled="isAnyActionRunning(row)" @click="handleCancel(row)">
          {{ t('stockDocument.actionCancel') }}
        </button>
        <button class="btn btn-sm btn-secondary" type="button" :disabled="isAnyActionRunning(row)" @click="openHistory(row)">
          {{ t('stockDocument.actionHistory') }}
        </button>
      </div>
    </div>
  </div>

  <div class="pagination-bar card card-pad">
    <span class="muted">{{ totalElements }} {{ isOut ? t('stockDocument.typeOut') : t('stockDocument.typeIn') }}</span>
    <div class="pagination-actions">
      <button class="btn btn-sm" type="button" :disabled="!hasPreviousPage" @click="previousPage">{{ t('stockDocument.paginationPrevious') }}</button>
      <span class="page-indicator">{{ t('stockDocument.pageIndicator', { current: totalPages === 0 ? 0 : page + 1, total: totalPages }) }}</span>
      <button class="btn btn-sm" type="button" :disabled="!hasNextPage" @click="nextPage">{{ t('stockDocument.paginationNext') }}</button>
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
