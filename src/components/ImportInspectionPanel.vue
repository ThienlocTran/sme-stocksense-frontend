<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { canProcessImportReceipt } from '../services/permissionService'
import { 
  getDetail,
  confirmArrival,
  inspectReceipt,
  createDiscrepancyReport,
  completeImport,
  getImportReceiptHistory,
  exportImportReceiptPdf,
  exportImportReceiptExcel
, cancelLateImportReceipt } from '../services/importReceiptService'
import { downloadBlobResponse, setPrintWindowBlob } from '../utils/downloadHelper'


const props = defineProps({
  receiptId: {
    type: [String, Number],
    required: true
  }
})

const receipt = ref(null)
const loading = ref(false)
const submitting = ref(false)
const savingDiscrepancy = ref(false)
const error = ref('')
const successMessage = ref('')
const exporting = ref(false)

// State cho form kiểm hàng
const inspectItems = ref([])

// State cho biên bản chênh lệch
const discrepancyNote = ref('')
const cancelLateState = ref({
  open: false,
  reason: '',
  error: '',
  submitting: false,
});

const discrepancyReportSaved = ref(false)
const savedDiscrepancySignature = ref('')

// {{ t('importInspection.approvalHistory') }}
const historyList = ref([])

const { t } = useI18n()
const authStore = useAuthStore()
const canProcessReceipt = computed(() => {
  return canProcessImportReceipt(authStore.currentRole)
})
const isReceiptOwner = computed(() => {
  if (!receipt.value) return false
  const currentUser = authStore.currentUser
  if (!currentUser) return false

  const creatorName = receipt.value.createdByName || receipt.value.createdBy || receipt.value.creatorName || receipt.value.creator
  const creatorId = receipt.value.createdById || receipt.value.creatorId || receipt.value.employeeId

  const matchByName = creatorName && (creatorName === currentUser.fullName || creatorName === currentUser.email)
  const matchById = creatorId && String(creatorId) === String(currentUser.employeeId)

  if (!creatorName && !creatorId) return true

  return Boolean(matchByName || matchById)
})

const canArrival = computed(() => {
  if (!canProcessReceipt.value) return false
  if (authStore.currentRole === 'EMPLOYEE') {
    return isReceiptOwner.value
  }
  return true
})
const canManageApproval = computed(() => ['ADMIN', 'MANAGER'].includes(authStore.currentRole));

const canCancelLate = computed(() => {
  return (
    canManageApproval.value &&
    !loading.value &&
    !submitting.value &&
    receipt.value &&
    (receipt.value.status === 'CHO_HANG_VE' || receipt.value.status === 'CHO_KIEM_HANG')
  );
});


const receiptItems = computed(() => receipt.value?.items ?? receipt.value?.details ?? [])

// Computed properties
const hasDiscrepancy = computed(() => {
  return inspectItems.value.some(item => item.actualReceivedQuantity !== item.expectedQuantity || hasPhysicalIssue(item.physicalStatus))
})

const discrepancyItems = computed(() => {
  return inspectItems.value.filter(item => item.actualReceivedQuantity !== item.expectedQuantity || hasPhysicalIssue(item.physicalStatus))
})

const currentDiscrepancySignature = computed(() => JSON.stringify({
  note: discrepancyNote.value,
  items: discrepancyItems.value.map(item => ({
    productId: item.productId,
    actualReceivedQuantity: Number(item.actualReceivedQuantity),
    physicalStatus: item.physicalStatus,
    reason: String(item.reason || '').trim(),
    action: String(item.action || '').trim()
  }))
}))

const isDiscrepancyReportCurrent = computed(() => {
  return discrepancyReportSaved.value && savedDiscrepancySignature.value === currentDiscrepancySignature.value
})

const statusColor = computed(() => {
  if (!receipt.value) return 'grey'
  const s = receipt.value.status
  if (s === 'HOAN_THANH') return 'success'
  if (s === 'HUY' || s === 'TU_CHOI') return 'error'
  if (s === 'CHO_HANG_VE' || s === 'CHO_KIEM_HANG') return 'warning'
  return 'primary'
})

const statusLabel = computed(() => {
  if (!receipt.value) return ''
  const labels = {
    NHAP: t('stockDocument.status.draft'),
    CHO_DUYET_CAP_1: t('stockDocument.status.pending'),
    CHO_DUYET_CAP_2: t('stockDocument.status.pending'),
    CHO_HANG_VE: t('stockDocument.status.pending_delivery'),
    CHO_KIEM_HANG: t('stockDocument.status.pending_inspection'),
    HOAN_THANH: t('stockDocument.status.completed'),
    TU_CHOI: t('stockDocument.status.rejected'),
    HUY: t('stockDocument.status.cancelled')
  }
  return labels[receipt.value.status] || receipt.value.status
})

const statusHelpers = {
  NHAP: t('stockDocument.statusDesc.draft'),
  CHO_DUYET_CAP_1: t('stockDocument.statusDesc.pending_level1'),
  CHO_DUYET_CAP_2: t('stockDocument.statusDesc.pending_level2'),
  CHO_HANG_VE: t('stockDocument.statusDesc.pending_delivery'),
  CHO_KIEM_HANG: t('stockDocument.statusDesc.pending_inspection'),
  HOAN_THANH: t('stockDocument.statusDesc.completed'),
  TU_CHOI: t('stockDocument.statusDesc.rejected'),
  HUY: t('stockDocument.statusDesc.cancelled')
}

const ACTION_LABELS = {
  GUI_DUYET: t('stockDocument.actionSubmit'),
  DUYET_CAP_1: t('approvals.actions.approveLevel', { level: 1 }),
  DUYET_CAP_2: t('approvals.actions.approveLevel', { level: 2 }),
  TU_CHOI: t('stockDocument.status.rejected'),
  HUY: t('stockDocument.actionCancel'),
}
const ACTION_ICONS = {
  GUI_DUYET: 'mdi-send-outline',
  DUYET_CAP_1: 'mdi-check-circle-outline',
  DUYET_CAP_2: 'mdi-check-decagram-outline',
  TU_CHOI: 'mdi-close-circle-outline',
  HUY: 'mdi-cancel',
}
const ACTION_COLORS = {
  GUI_DUYET: 'info',
  DUYET_CAP_1: 'success',
  DUYET_CAP_2: 'success',
  TU_CHOI: 'error',
  HUY: 'grey',
}

function getHistoryActionLabel(action) {
  return ACTION_LABELS[action] || action
}
function getHistoryActionIcon(action) {
  return ACTION_ICONS[action] || 'mdi-circle-medium'
}
function getHistoryActionColor(action) {
  return ACTION_COLORS[action] || 'grey'
}

const physicalStatusOptions = computed(() => [
  { value: 'Tốt', title: t('importInspection.physicalStatus.good') },
  { value: 'Hư hỏng', title: t('importInspection.physicalStatus.damaged') },
  { value: 'Thiếu', title: t('importInspection.physicalStatus.missing') },
  { value: 'Khác', title: t('importInspection.physicalStatus.other') }
])

let currentRequestId = 0

async function loadData() {
  const requestId = ++currentRequestId
  loading.value = true
  error.value = ''
  historyList.value = []
  try {
    const data = await getDetail(props.receiptId)
    if (requestId !== currentRequestId) return
    receipt.value = data
    inspectItems.value = []
    discrepancyNote.value = ''
    discrepancyReportSaved.value = false
    savedDiscrepancySignature.value = ''
    // Khởi tạo form kiểm hàng
    const detailItems = data.items ?? data.details ?? []
    if (detailItems.length > 0) {
      inspectItems.value = detailItems.map(item => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        expectedQuantity: item.quantity,
        unitName: item.unitName || t('importInspection.table.pcs'),
        actualReceivedQuantity: item.quantity, // mặc định bằng số lượng mong đợi
        physicalStatus: 'Tốt',
        expiryDate: '',
        // fields cho biên bản chênh lệch
        reason: '',
        action: ''
      }))
    }

    // Load history
    try {
      historyList.value = await getImportReceiptHistory(props.receiptId)
    } catch (histErr) {
      console.error('Failed to load history:', histErr)
    }
  } catch (err) {
    if (requestId !== currentRequestId) return
    error.value = err.message || t('importInspection.messages.loadError')
  } finally {
    if (requestId !== currentRequestId) return
    loading.value = false
  }
}

function hasPhysicalIssue(status) {
  if (!status) return false
  return !['Tốt', 'Bình thường', 'Nguyên vẹn'].includes(status)
}

function buildInspectPayload() {
  return {
    items: inspectItems.value.map(item => ({
      productId: item.productId,
      actualReceivedQuantity: Number(item.actualReceivedQuantity),
      physicalStatus: item.physicalStatus,
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : null
    }))
  }
}

function buildDiscrepancyPayload() {
  return {
    note: discrepancyNote.value,
    items: discrepancyItems.value.map(item => ({
      productId: item.productId,
      reason: String(item.reason || '').trim(),
      action: String(item.action || '').trim()
    }))
  }
}

function findInvalidDiscrepancyItem() {
  return discrepancyItems.value.find(item => !String(item.reason || '').trim() || !String(item.action || '').trim())
}

async function handleArrival() {
  submitting.value = true
  error.value = ''
  successMessage.value = ''
  try {
    await confirmArrival(props.receiptId)
    successMessage.value = t('importInspection.messages.confirmArrivalSuccess')
    await loadData()
  } catch (err) {
    error.value = err.message || t('importInspection.messages.confirmArrivalError')
  } finally {
    submitting.value = false
  }
}

function openCancelLateModal() {
  cancelLateState.value = {
    open: true,
    reason: '',
    error: '',
    submitting: false,
  };
}

function closeCancelLateModal() {
  if (cancelLateState.value.submitting) return;
  cancelLateState.value = {
    open: false,
    reason: '',
    error: '',
    submitting: false,
  };
}

async function confirmCancelLate() {
  const reason = cancelLateState.value.reason.trim();
  if (!reason) {
    cancelLateState.value.error = t('importInspection.messages.reasonRequired');
    return;
  }
  if (reason.length > 500) {
    cancelLateState.value.error = t('importInspection.messages.reasonMaxLength');
    return;
  }

  cancelLateState.value.submitting = true;
  cancelLateState.value.error = '';
  error.value = '';
  successMessage.value = '';

  try {
    const cancelledReceipt = await cancelLateImportReceipt(String(props.receiptId), reason);
    receipt.value = cancelledReceipt;
    cancelLateState.value = { open: false, reason: '', error: '', submitting: false };
    successMessage.value = t('importInspection.messages.cancelSuccess', { code: cancelledReceipt?.code || props.receiptId });
    await loadData();
  } catch (err) {
    cancelLateState.value.submitting = false;
    cancelLateState.value.error = err.message || t('importInspection.messages.cancelError');
  }
}

async function handleComplete() {
  submitting.value = true
  error.value = ''
  successMessage.value = ''
  try {
    if (inspectItems.value.length === 0) {
      error.value = t('importInspection.messages.emptyInspect')
      return
    }

    const invalidItem = inspectItems.value.find(item => {
      if (item.actualReceivedQuantity === '' || item.actualReceivedQuantity == null) return true
      const qty = Number(item.actualReceivedQuantity)
      return !Number.isFinite(qty) || qty < 0
    })

    if (invalidItem) {
      error.value = t('importInspection.messages.invalidQty', { name: invalidItem.productName })
      return
    }

    if (hasDiscrepancy.value && !isDiscrepancyReportCurrent.value) {
      error.value = t('importInspection.messages.discrepancyWarning')
      return
    }

    await completeImport(props.receiptId, buildInspectPayload())
    
    successMessage.value = t('importInspection.messages.completeSuccess')
    await loadData()
  } catch (err) {
    error.value = err.message || t('importInspection.messages.completeError')
  } finally {
    submitting.value = false
  }
}

async function handleSaveDiscrepancyReport() {
  savingDiscrepancy.value = true
  error.value = ''
  successMessage.value = ''
  try {
    if (!hasDiscrepancy.value) {
      error.value = t('importInspection.messages.emptyDiscrepancyReport')
      return
    }
    const invalidItem = findInvalidDiscrepancyItem()
    if (invalidItem) {
      error.value = t('importInspection.messages.fillDiscrepancyReason', { name: invalidItem.productName })
      return
    }
    await inspectReceipt(props.receiptId, buildInspectPayload())
    await createDiscrepancyReport(props.receiptId, buildDiscrepancyPayload())
    discrepancyReportSaved.value = true
    savedDiscrepancySignature.value = currentDiscrepancySignature.value
    successMessage.value = t('importInspection.messages.discrepancyReportSaved')
  } catch (err) {
    error.value = err.message || t('importInspection.messages.completeError')
  } finally {
    savingDiscrepancy.value = false
  }
}

function formatCurrency(value) {
  if (value == null) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('vi-VN')
}

function hasActualReceivedQuantity(item) {
  return item.actualReceivedQuantity !== null && item.actualReceivedQuantity !== undefined
}

function getDiscrepancyQuantity(item) {
  if (!hasActualReceivedQuantity(item)) return null
  return Number(item.actualReceivedQuantity) - Number(item.quantity ?? 0)
}

function formatDiscrepancy(item) {
  const discrepancy = getDiscrepancyQuantity(item)
  if (discrepancy === null) return '-'
  if (discrepancy === 0) return '0'
  return `${discrepancy > 0 ? '+' : ''}${discrepancy}`
}

function getPlannedLineTotal(item) {
  if (item.lineTotal != null) return item.lineTotal
  return Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)
}

function getActualLineTotal(item) {
  if (!hasActualReceivedQuantity(item)) return null
  return Number(item.actualReceivedQuantity) * Number(item.unitPrice ?? 0)
}

async function handleExport(format) {
  if (exporting.value) return
  error.value = ''
  successMessage.value = ''

  let printWindow = null
  if (format === 'print') {
    printWindow = window.open('', '_blank')
    if (!printWindow) {
      error.value = t('importInspection.messages.printPopupBlocked')
      return
    }
    printWindow.document.write('<p style="font-family:sans-serif; text-align:center; margin-top:20px;">' + t('importInspection.messages.loadingPrintPdf') + '</p>')
  }

  exporting.value = true
  try {
    if (format === 'pdf') {
      const response = await exportImportReceiptPdf(props.receiptId)
      downloadBlobResponse(response, `phieu-nhap-${receipt.value?.code || props.receiptId}.pdf`)
      successMessage.value = t('importInspection.messages.exportPdfSuccess')
    } else if (format === 'excel') {
      const response = await exportImportReceiptExcel(props.receiptId)
      downloadBlobResponse(response, `phieu-nhap-${receipt.value?.code || props.receiptId}.xlsx`)
      successMessage.value = t('importInspection.messages.exportExcelSuccess')
    } else if (format === 'print') {
      const response = await exportImportReceiptPdf(props.receiptId)
      setPrintWindowBlob(printWindow, response)
    }
  } catch (err) {
    if (printWindow) {
      printWindow.close()
    }
    const actionLabel = format === 'pdf' ? 'xuất phiếu PDF' : format === 'excel' ? 'xuất file Excel' : 'mở bản in'
    error.value = err.message || t('importInspection.messages.exportFailed', { label: actionLabel })
  } finally {
    exporting.value = false
  }
}

watch(() => props.receiptId, loadData, { immediate: true })
</script>

<template>
  <div v-if="loading" class="d-flex justify-center my-8">
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
  </div>
  
  <div v-else-if="receipt">
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-alert v-if="successMessage" type="success" variant="tonal" class="mb-4" closable @click:close="successMessage = ''">
      {{ successMessage }}
    </v-alert>

    <!-- Thông tin chung -->
    <v-card class="mb-6 rounded-lg elevation-1" border>
      <v-card-title class="font-weight-bold d-flex align-center py-3 px-4">
        <span>{{ t('importInspection.title', { code: receipt.code }) }}</span>
        <v-spacer></v-spacer>
        <v-chip :color="statusColor" class="font-weight-medium mr-2">{{ statusLabel }}</v-chip>
        <v-menu transition="slide-y-transition">
          <template v-slot:activator="{ props }">
            <v-btn
              color="primary"
              variant="outlined"
              v-bind="props"
              :loading="exporting"
              prepend-icon="mdi-export-variant"
              append-icon="mdi-chevron-down"
              size="small"
              class="font-weight-medium text-capitalize ml-2"
            >
              Xuất phiếu
            </v-btn>
          </template>
          <v-list density="compact" nav class="py-1">
            <v-list-item prepend-icon="mdi-printer" :title="t('importInspection.btn.print')" @click="handleExport('print')" />
            <v-list-item prepend-icon="mdi-file-pdf-box" :title="t('importInspection.btn.exportPdf')" @click="handleExport('pdf')" />
            <v-list-item prepend-icon="mdi-file-excel-box" :title="t('importInspection.btn.exportExcel')" @click="handleExport('excel')" />
          </v-list>
        </v-menu>
      </v-card-title>
      <v-card-text class="pt-2 px-4 pb-4">
        <!-- Status Helper Description -->
        <div class="text-subtitle-2 text-grey-darken-2 mb-4 bg-grey-lighten-4 pa-3 rounded-lg border-left-brand">
          <v-icon start size="small" color="primary">mdi-information-outline</v-icon>
          <strong>{{ t('stockDocument.columns.status') }}:</strong> {{ statusHelpers[receipt.status] || t('importInspection.messages.unknownStatus') }}
        </div>

        <v-row>
          <v-col cols="12" sm="6" md="3">
            <div class="text-caption text-grey">{{ t('stockDocument.columns.warehouse') }}</div>
            <div class="font-weight-medium text-body-1">{{ receipt.warehouseName || '-' }}</div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="text-caption text-grey">{{ t('stockDocument.columns.supplier') }}</div>
            <div class="font-weight-medium text-body-1">{{ receipt.supplierName || '-' }}</div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="text-caption text-grey">{{ t('stockDocument.columns.totalAmount') }}</div>
            <div class="font-weight-bold text-body-1 text-primary">{{ formatCurrency(receipt.totalAmount) }}</div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="text-caption text-grey">{{ t('stockDocument.columns.createdAt') }}</div>
            <div class="font-weight-medium text-body-1">{{ formatDate(receipt.createdAt) }}</div>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions v-if="receipt.status === 'CHO_HANG_VE' && (canArrival || canCancelLate)" class="bg-grey-lighten-4 pa-4 border-top">
        <v-spacer></v-spacer>
        <v-btn v-if="canCancelLate" color="error" variant="text" :loading="cancelLateState.submitting" @click="openCancelLateModal">
          <v-icon start>mdi-cancel</v-icon>
          {{ t('importInspection.btn.cancelReceipt') }}
        </v-btn>
        <v-btn v-if="canProcessReceipt" color="primary" variant="flat" :loading="submitting" @click="handleArrival">
          <v-icon start>mdi-truck-check</v-icon>
          {{ t('importInspection.btn.confirmArrival') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Kiểm hàng thực tế (khi status = CHO_KIEM_HANG) -->
    <v-card v-if="receipt.status === 'CHO_KIEM_HANG' && canProcessReceipt" class="mb-6 rounded-lg elevation-1 border-primary" border>
      <v-card-title class="bg-primary text-white d-flex align-center py-3">
        <v-icon start>mdi-clipboard-check</v-icon>
        {{ t('importInspection.step2Title') }}
      </v-card-title>
      <v-card-text class="pt-4">
        <!-- Desktop view table -->
        <div class="hidden-sm-and-down">
          <v-table hover v-if="inspectItems.length > 0">
            <thead>
              <tr>
                <th class="text-left">{{ t('importInspection.table.product') }}</th>
                <th class="text-center" width="120">{{ t('importInspection.table.expectedQty') }}</th>
                <th class="text-center" width="150">{{ t('importInspection.table.actualReceivedQty') }}</th>
                <th class="text-left" width="200">{{ t('importInspection.table.physicalStatus') }}</th>
                <th class="text-left" width="200">{{ t('importInspection.table.expiryDate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in inspectItems" :key="item.productId" :class="{'bg-red-lighten-5': item.actualReceivedQuantity !== item.expectedQuantity || hasPhysicalIssue(item.physicalStatus)}">
                <td>
                  <div class="font-weight-bold">{{ item.productName }}</div>
                  <div class="text-caption text-grey">{{ item.productCode }}</div>
                </td>
                <td class="text-center font-weight-bold">{{ item.expectedQuantity }} {{ item.unitName }}</td>
                <td>
                  <v-text-field
                    v-model.number="item.actualReceivedQuantity"
                    type="number"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="bg-white"
                  ></v-text-field>
                </td>
                <td>
                  <v-select
                    v-model="item.physicalStatus"
                    :items="physicalStatusOptions" item-title="title" item-value="value"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="bg-white"
                  ></v-select>
                </td>
                <td>
                  <v-text-field
                    v-model="item.expiryDate"
                    type="date"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="bg-white"
                    clearable
                  ></v-text-field>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- Mobile stacked blocks -->
        <div class="hidden-md-and-up">
          <div v-for="item in inspectItems" :key="item.productId" 
               class="mb-3 pa-3 rounded-lg border"
               :class="item.actualReceivedQuantity !== item.expectedQuantity || hasPhysicalIssue(item.physicalStatus) ? 'bg-red-lighten-5 border-error' : 'bg-grey-lighten-5'">
            <div class="font-weight-bold text-subtitle-1">{{ item.productName }}</div>
            <div class="text-caption text-grey mb-3">SKU: {{ item.productCode }} | {{ t('importInspection.table.expectedQty') }}: {{ item.expectedQuantity }} {{ item.unitName }}</div>

            <v-row class="ma-0">
              <v-col cols="12" class="pa-1">
                <v-text-field
                  v-model.number="item.actualReceivedQuantity"
                  :label="t('importInspection.table.actualReceivedQty')"
                  type="number"
                  min="0"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="bg-white"
                ></v-text-field>
              </v-col>
              <v-col cols="6" class="pa-1">
                <v-select
                  v-model="item.physicalStatus"
                  :items="physicalStatusOptions" item-title="title" item-value="value"
                  :label="t('importInspection.table.physicalStatus')"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="bg-white"
                ></v-select>
              </v-col>
              <v-col cols="6" class="pa-1">
                <v-text-field
                  v-model="item.expiryDate"
                  :label="t('importInspection.table.expiryDate')"
                  type="date"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="bg-white"
                  clearable
                ></v-text-field>
              </v-col>
            </v-row>
          </div>
        </div>

        <v-alert v-if="inspectItems.length === 0" type="info" variant="tonal" class="mt-2">
          {{ t('importInspection.emptyList') }}
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Biên bản chênh lệch (nếu có lệch) -->
    <v-card v-if="receipt.status === 'CHO_KIEM_HANG' && hasDiscrepancy && canProcessReceipt" class="mb-6 rounded-lg elevation-1 border-error" border>
      <v-card-title class="bg-error text-white d-flex align-center py-3">
        <v-icon start>mdi-alert</v-icon>
        {{ t('importInspection.discrepancyTitle') }}
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert type="warning" variant="tonal" class="mb-4">
          {{ t('importInspection.messages.discrepancyWarning') }}
        </v-alert>

        <v-alert v-if="isDiscrepancyReportCurrent" type="success" variant="tonal" class="mb-4">
          {{ t('importInspection.messages.discrepancyReportSaved') }}
        </v-alert>

        <v-textarea
          v-model="discrepancyNote"
          :label="t('importInspection.discrepancyNote')"
          variant="outlined"
          rows="2"
          class="mb-4"
        ></v-textarea>

        <div v-for="item in discrepancyItems" :key="item.productId" class="mb-4 pa-4 bg-grey-lighten-4 rounded">
          <div class="font-weight-bold mb-2">
            {{ item.productName }}
            <v-chip size="small" color="error" class="ml-2">{{ t('importInspection.table.discrepancy') }}: {{ item.actualReceivedQuantity - item.expectedQuantity }} {{ item.unitName }}</v-chip>
          </div>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="item.reason"
                :label="t('importInspection.discrepancyReason')"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="item.action"
                :label="t('importInspection.discrepancyAction')"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
          </v-row>
        </div>
        <div class="d-flex justify-end">
          <v-btn
            color="error"
            variant="flat"
            :loading="savingDiscrepancy"
            @click="handleSaveDiscrepancyReport"
          >
            <v-icon start>mdi-content-save-alert</v-icon>
            {{ t('importInspection.btn.saveDiscrepancy') }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Nút Action Cuối (CHO_KIEM_HANG) -->
    <div v-if="receipt.status === 'CHO_KIEM_HANG' && (canProcessReceipt || canCancelLate)" class="d-flex justify-end mb-6">
      <v-btn
        v-if="canCancelLate"
        color="error"
        size="large"
        variant="text"
        class="mr-4"
        :loading="cancelLateState.submitting"
        @click="openCancelLateModal"
      >
        <v-icon start>mdi-cancel</v-icon>
        {{ t('importInspection.btn.cancelReceipt') }}
      </v-btn>
      <v-btn
        color="primary"
        size="large"
        variant="flat"
        :loading="submitting"
        :disabled="inspectItems.length === 0 || (hasDiscrepancy && !isDiscrepancyReportCurrent)"
        @click="handleComplete"
      >
        <v-icon start>mdi-check-circle</v-icon>
        {{ t('importInspection.btn.completeImport') }}
      </v-btn>
    </div>

    <!-- Chỉ xem danh sách sản phẩm nếu không ở trạng thái cần action -->
    <v-card v-if="receipt.status !== 'CHO_KIEM_HANG' || !canProcessReceipt" class="mb-6 rounded-lg elevation-1" border>
      <v-card-title class="font-weight-bold bg-grey-lighten-4 py-3">
        {{ t('importInspection.productListTitle') }}
      </v-card-title>
      <v-card-text class="pa-0">
        <v-table>
          <thead>
            <tr>
              <th class="text-left">{{ t('importInspection.table.product') }}</th>
              <th class="text-center">{{ t('importInspection.table.expectedQty') }}</th>
              <th class="text-center">{{ t('importInspection.table.actualReceivedQty') }}</th>
              <th class="text-center">{{ t('importInspection.table.discrepancy') }}</th>
              <th class="text-right">{{ t('importInspection.table.unitPrice') }}</th>
              <th class="text-right">{{ t('importInspection.table.lineTotal') }}</th>
              <th class="text-right">{{ t('importInspection.table.actualReceivedTotal') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in receiptItems" :key="item.productId">
              <td>
                <div class="font-weight-bold">{{ item.productName }}</div>
                <div class="text-caption text-grey">{{ item.productCode }}</div>
              </td>
              <td class="text-center font-weight-medium">{{ item.quantity }} {{ item.unitName || t('importInspection.table.pcs') }}</td>
              <td class="text-center font-weight-medium">
                <span v-if="hasActualReceivedQuantity(item)">{{ item.actualReceivedQuantity }} {{ item.unitName || t('importInspection.table.pcs') }}</span>
                <span v-else>-</span>
              </td>
              <td class="text-center">
                <v-chip
                  v-if="getDiscrepancyQuantity(item) !== null && getDiscrepancyQuantity(item) !== 0"
                  size="small"
                  :color="getDiscrepancyQuantity(item) > 0 ? 'warning' : 'error'"
                  variant="tonal"
                >
                  {{ formatDiscrepancy(item) }} {{ item.unitName || t('importInspection.table.pcs') }}
                </v-chip>
                <span v-else>{{ formatDiscrepancy(item) }}</span>
              </td>
              <td class="text-right">{{ formatCurrency(item.unitPrice) }}</td>
              <td class="text-right font-weight-medium">{{ formatCurrency(getPlannedLineTotal(item)) }}</td>
              <td class="text-right font-weight-medium text-error">
                <span v-if="getActualLineTotal(item) !== null">{{ formatCurrency(getActualLineTotal(item)) }}</span>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- {{ t('importInspection.approvalHistory') }} timeline trực tiếp trên trang -->
    <v-card class="mb-6 rounded-lg elevation-1" border>
      <v-card-title class="font-weight-bold bg-grey-lighten-4 py-3">
        <v-icon start>mdi-history</v-icon>
        {{ t('importInspection.approvalHistory') }}
      </v-card-title>
      <v-card-text class="pt-4">
        <div v-if="historyList.length === 0" class="text-grey italic text-body-2 text-center py-4">
          {{ t('importInspection.emptyHistory') }}
        </div>
        <div v-else class="history-timeline">
          <div v-for="(item, index) in historyList" :key="item.id" class="history-item mb-4 d-flex align-start">
            <div class="history-marker mr-3 mt-1">
              <v-icon size="small" :color="getHistoryActionColor(item.action)">
                {{ getHistoryActionIcon(item.action) }}
              </v-icon>
            </div>
            <div class="history-info">
              <div class="d-flex align-center flex-wrap">
                <span class="font-weight-bold mr-2 text-body-2">{{ getHistoryActionLabel(item.action) }}</span>
                <span class="text-caption text-grey">{{ formatDate(item.createdAt) }}</span>
              </div>
              <div class="text-body-2 mt-1">
                <strong>{{ t('importInspection.actorLabel') }}</strong> {{ item.actorName || 'Hệ thống' }}
              </div>
              <div v-if="item.note" class="text-body-2 text-error mt-1 italic pl-3 border-left-error">
                {{ t('importInspection.reasonLabel') }} {{ item.note }}
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>

  <div v-else class="d-flex flex-column align-center my-8">
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" max-width="600">
      {{ error }}
    </v-alert>
    <v-btn color="primary" @click="loadData">
      <v-icon start>mdi-reload</v-icon>
      {{ t('importInspection.btn.reload') }}
    </v-btn>
  </div>

  <v-dialog v-model="cancelLateState.open" max-width="500px" persistent>
    <v-card>
      <v-card-title class="text-h6 pt-4 pb-2 px-6">
        {{ t('importInspection.btn.cancelReceipt') }}
        <v-btn icon="mdi-close" variant="text" size="small" class="float-right" :disabled="cancelLateState.submitting" @click="closeCancelLateModal"></v-btn>
      </v-card-title>
      <v-card-text class="px-6 pb-2">
        <p class="mb-4 text-body-2 text-grey-darken-1">{{ t('importInspection.cancelReasonDesc') }} <span class="text-error">*</span></p>
        <v-textarea
          v-model="cancelLateState.reason"
          rows="4"
          variant="outlined"
          density="comfortable"
          :placeholder="t('importInspection.cancelReasonPlaceholder')"
          :error-messages="cancelLateState.error ? [cancelLateState.error] : []"
          @update:model-value="cancelLateState.error = ''"
        ></v-textarea>
        <div class="d-flex justify-end mt-1 text-caption text-grey">
          {{ cancelLateState.reason.length }}/500
        </div>
      </v-card-text>
      <v-card-actions class="px-6 pb-4">
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" variant="text" :disabled="cancelLateState.submitting" @click="closeCancelLateModal">Hủy</v-btn>
        <v-btn color="error" variant="flat" :loading="cancelLateState.submitting" @click="confirmCancelLate">
          {{ t('importInspection.btn.cancelReceipt') }}Xác nhận hủy</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.border-left-brand {
  border-left: 4px solid var(--color-primary, #2563EB);
}
.border-left-error {
  border-left: 3px solid var(--color-danger, #DC2626);
}
.history-timeline {
  position: relative;
  padding-left: 8px;
}
.history-item {
  position: relative;
}
</style>

