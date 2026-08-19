<script setup>
import { ref, computed, watch } from 'vue'
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

// Lịch sử phê duyệt
const historyList = ref([])

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
    NHAP: 'Bản nháp',
    CHO_DUYET_CAP_1: 'Chờ duyệt cấp 1',
    CHO_DUYET_CAP_2: 'Chờ duyệt cấp 2',
    CHO_HANG_VE: 'Chờ hàng về',
    CHO_KIEM_HANG: 'Chờ kiểm hàng',
    HOAN_THANH: 'Hoàn thành',
    TU_CHOI: 'Từ chối',
    HUY: 'Đã hủy'
  }
  return labels[receipt.value.status] || receipt.value.status
})

const statusHelpers = {
  NHAP: 'Bản nháp - phiếu chưa được gửi phê duyệt.',
  CHO_DUYET_CAP_1: 'Chờ duyệt cấp 1 - đang chờ quản lý kho cấp 1 xử lý.',
  CHO_DUYET_CAP_2: 'Chờ duyệt cấp 2 - đang chờ quản lý kho cấp 2 xử lý.',
  CHO_HANG_VE: 'Chờ hàng về - phiếu đã duyệt, đang chờ hàng giao đến kho.',
  CHO_KIEM_HANG: 'Chờ kiểm hàng - hàng đã về kho, vui lòng thực hiện kiểm kê thực tế.',
  HOAN_THANH: 'Hoàn thành - phiếu nhập kho đã hoàn tất và lưu kho thành công.',
  TU_CHOI: 'Từ chối - phiếu bị từ chối phê duyệt. Vui lòng kiểm tra lý do và chỉnh sửa.',
  HUY: 'Đã hủy - phiếu nhập kho đã bị hủy.'
}

const ACTION_LABELS = {
  GUI_DUYET: 'Gửi duyệt',
  DUYET_CAP_1: 'Duyệt cấp 1',
  DUYET_CAP_2: 'Duyệt cấp 2',
  TU_CHOI: 'Từ chối',
  HUY: 'Hủy phiếu',
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

const physicalStatusOptions = ['Tốt', 'Hư hỏng', 'Thiếu', 'Khác']

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
        unitName: item.unitName || 'Cái',
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
    error.value = err.message || 'Lỗi tải dữ liệu phiếu nhập'
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
    successMessage.value = 'Đã xác nhận hàng về thành công.'
    await loadData()
  } catch (err) {
    error.value = err.message || 'Lỗi khi xác nhận hàng về'
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
    cancelLateState.value.error = 'Vui lòng nhập lý do hủy.';
    return;
  }
  if (reason.length > 500) {
    cancelLateState.value.error = `Lý do hủy không được vượt quá 500 ký tự.`;
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
    successMessage.value = `Đã hủy phiếu ${cancelledReceipt?.code || props.receiptId} thành công.`;
    await loadData();
  } catch (err) {
    cancelLateState.value.submitting = false;
    cancelLateState.value.error = err.message || 'Không thể hủy phiếu nhập.';
  }
}

async function handleComplete() {
  submitting.value = true
  error.value = ''
  successMessage.value = ''
  try {
    if (inspectItems.value.length === 0) {
      error.value = 'Không có sản phẩm nào để kiểm tra.'
      return
    }

    const invalidItem = inspectItems.value.find(item => {
      if (item.actualReceivedQuantity === '' || item.actualReceivedQuantity == null) return true
      const qty = Number(item.actualReceivedQuantity)
      return !Number.isFinite(qty) || qty < 0
    })

    if (invalidItem) {
      error.value = `Số lượng thực nhận của "${invalidItem.productName}" không hợp lệ.`
      return
    }

    if (hasDiscrepancy.value && !isDiscrepancyReportCurrent.value) {
      error.value = 'Có chênh lệch số lượng/tình trạng hàng. Vui lòng lưu biên bản chênh lệch trước khi hoàn tất nhập kho.'
      return
    }

    await completeImport(props.receiptId, buildInspectPayload())
    
    successMessage.value = 'Đã hoàn tất nhập kho thành công.'
    await loadData()
  } catch (err) {
    error.value = err.message || 'Lỗi khi hoàn tất phiếu nhập'
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
      error.value = 'Không có chênh lệch để lập biên bản.'
      return
    }
    const invalidItem = findInvalidDiscrepancyItem()
    if (invalidItem) {
      error.value = `Vui lòng nhập lý do và hướng xử lý cho "${invalidItem.productName}".`
      return
    }
    await inspectReceipt(props.receiptId, buildInspectPayload())
    await createDiscrepancyReport(props.receiptId, buildDiscrepancyPayload())
    discrepancyReportSaved.value = true
    savedDiscrepancySignature.value = currentDiscrepancySignature.value
    successMessage.value = 'Đã lưu biên bản chênh lệch. Bạn có thể hoàn tất nhập kho theo số lượng thực nhận.'
  } catch (err) {
    error.value = err.message || 'Không thể lưu biên bản chênh lệch.'
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
      error.value = 'Không thể mở bản in. Vui lòng cho phép trình duyệt hiển thị popup.'
      return
    }
    printWindow.document.write('<p style="font-family:sans-serif; text-align:center; margin-top:20px;">Đang tải bản in PDF...</p>')
  }

  exporting.value = true
  try {
    if (format === 'pdf') {
      const response = await exportImportReceiptPdf(props.receiptId)
      downloadBlobResponse(response, `phieu-nhap-${receipt.value?.code || props.receiptId}.pdf`)
      successMessage.value = 'Xuất phiếu PDF thành công.'
    } else if (format === 'excel') {
      const response = await exportImportReceiptExcel(props.receiptId)
      downloadBlobResponse(response, `phieu-nhap-${receipt.value?.code || props.receiptId}.xlsx`)
      successMessage.value = 'Xuất file Excel thành công.'
    } else if (format === 'print') {
      const response = await exportImportReceiptPdf(props.receiptId)
      setPrintWindowBlob(printWindow, response)
    }
  } catch (err) {
    if (printWindow) {
      printWindow.close()
    }
    const actionLabel = format === 'pdf' ? 'xuất phiếu PDF' : format === 'excel' ? 'xuất file Excel' : 'mở bản in'
    error.value = err.message || `Không thể ${actionLabel}.`
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
        <span>Phiếu Nhập: {{ receipt.code }}</span>
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
            <v-list-item prepend-icon="mdi-printer" title="In phiếu" @click="handleExport('print')" />
            <v-list-item prepend-icon="mdi-file-pdf-box" title="Xuất PDF" @click="handleExport('pdf')" />
            <v-list-item prepend-icon="mdi-file-excel-box" title="Xuất Excel" @click="handleExport('excel')" />
          </v-list>
        </v-menu>
      </v-card-title>
      <v-card-text class="pt-2 px-4 pb-4">
        <!-- Status Helper Description -->
        <div class="text-subtitle-2 text-grey-darken-2 mb-4 bg-grey-lighten-4 pa-3 rounded-lg border-left-brand">
          <v-icon start size="small" color="primary">mdi-information-outline</v-icon>
          <strong>Trạng thái:</strong> {{ statusHelpers[receipt.status] || 'Trạng thái không xác định.' }}
        </div>

        <v-row>
          <v-col cols="12" sm="6" md="3">
            <div class="text-caption text-grey">Kho hàng</div>
            <div class="font-weight-medium text-body-1">{{ receipt.warehouseName || '-' }}</div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="text-caption text-grey">Nhà cung cấp</div>
            <div class="font-weight-medium text-body-1">{{ receipt.supplierName || '-' }}</div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="text-caption text-grey">Tổng tiền</div>
            <div class="font-weight-bold text-body-1 text-primary">{{ formatCurrency(receipt.totalAmount) }}</div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="text-caption text-grey">Ngày tạo</div>
            <div class="font-weight-medium text-body-1">{{ formatDate(receipt.createdAt) }}</div>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions v-if="receipt.status === 'CHO_HANG_VE' && (canArrival || canCancelLate)" class="bg-grey-lighten-4 pa-4 border-top">
        <v-spacer></v-spacer>
        <v-btn v-if="canCancelLate" color="error" variant="text" :loading="cancelLateState.submitting" @click="openCancelLateModal">
          <v-icon start>mdi-cancel</v-icon>
          Hủy Phiếu Nhập
        </v-btn>
        <v-btn v-if="canProcessReceipt" color="primary" variant="flat" :loading="submitting" @click="handleArrival">
          <v-icon start>mdi-truck-check</v-icon>
          Xác Nhận Hàng Về
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Kiểm hàng thực tế (khi status = CHO_KIEM_HANG) -->
    <v-card v-if="receipt.status === 'CHO_KIEM_HANG' && canProcessReceipt" class="mb-6 rounded-lg elevation-1 border-primary" border>
      <v-card-title class="bg-primary text-white d-flex align-center py-3">
        <v-icon start>mdi-clipboard-check</v-icon>
        Bước 2: Kiểm Hàng Thực Tế
      </v-card-title>
      <v-card-text class="pt-4">
        <!-- Desktop view table -->
        <div class="hidden-sm-and-down">
          <v-table hover v-if="inspectItems.length > 0">
            <thead>
              <tr>
                <th class="text-left">Sản phẩm</th>
                <th class="text-center" width="120">SL Gốc</th>
                <th class="text-center" width="150">Thực nhận</th>
                <th class="text-left" width="200">Tình trạng</th>
                <th class="text-left" width="200">Hạn sử dụng</th>
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
                    :items="physicalStatusOptions"
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
            <div class="text-caption text-grey mb-3">SKU: {{ item.productCode }} | Yêu cầu: {{ item.expectedQuantity }} {{ item.unitName }}</div>

            <v-row class="ma-0">
              <v-col cols="12" class="pa-1">
                <v-text-field
                  v-model.number="item.actualReceivedQuantity"
                  label="Số lượng thực nhận"
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
                  :items="physicalStatusOptions"
                  label="Tình trạng"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="bg-white"
                ></v-select>
              </v-col>
              <v-col cols="6" class="pa-1">
                <v-text-field
                  v-model="item.expiryDate"
                  label="Hạn sử dụng"
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
          Không có sản phẩm nào để kiểm tra.
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Biên bản chênh lệch (nếu có lệch) -->
    <v-card v-if="receipt.status === 'CHO_KIEM_HANG' && hasDiscrepancy && canProcessReceipt" class="mb-6 rounded-lg elevation-1 border-error" border>
      <v-card-title class="bg-error text-white d-flex align-center py-3">
        <v-icon start>mdi-alert</v-icon>
        Biên Bản Chênh Lệch
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert type="warning" variant="tonal" class="mb-4">
          Có chênh lệch giữa số lượng thực nhận và số lượng trên phiếu. Vui lòng ghi lý do/hướng xử lý và lưu biên bản trước khi hoàn tất.
        </v-alert>

        <v-alert v-if="isDiscrepancyReportCurrent" type="success" variant="tonal" class="mb-4">
          Đã lưu biên bản chênh lệch. Bạn có thể hoàn tất nhập kho theo số lượng thực nhận.
        </v-alert>

        <v-textarea
          v-model="discrepancyNote"
          label="Ghi chú tổng quát biên bản"
          variant="outlined"
          rows="2"
          class="mb-4"
        ></v-textarea>

        <div v-for="item in discrepancyItems" :key="item.productId" class="mb-4 pa-4 bg-grey-lighten-4 rounded">
          <div class="font-weight-bold mb-2">
            {{ item.productName }}
            <v-chip size="small" color="error" class="ml-2">Lệch: {{ item.actualReceivedQuantity - item.expectedQuantity }} {{ item.unitName }}</v-chip>
          </div>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="item.reason"
                label="Lý do chênh lệch"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="item.action"
                label="Hướng xử lý đề xuất"
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
            Lưu biên bản chênh lệch
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
        Hủy Phiếu Nhập
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
        Hoàn Tất Nhập Kho
      </v-btn>
    </div>

    <!-- Chỉ xem danh sách sản phẩm nếu không ở trạng thái cần action -->
    <v-card v-if="receipt.status !== 'CHO_KIEM_HANG' || !canProcessReceipt" class="mb-6 rounded-lg elevation-1" border>
      <v-card-title class="font-weight-bold bg-grey-lighten-4 py-3">
        Danh sách sản phẩm
      </v-card-title>
      <v-card-text class="pa-0">
        <v-table>
          <thead>
            <tr>
              <th class="text-left">Sản phẩm</th>
              <th class="text-center">SL trên phiếu</th>
              <th class="text-center">SL thực nhận</th>
              <th class="text-center">Chênh lệch</th>
              <th class="text-right">Đơn giá</th>
              <th class="text-right">Thành tiền trên phiếu</th>
              <th class="text-right">Giá trị thực nhận</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in receiptItems" :key="item.productId">
              <td>
                <div class="font-weight-bold">{{ item.productName }}</div>
                <div class="text-caption text-grey">{{ item.productCode }}</div>
              </td>
              <td class="text-center font-weight-medium">{{ item.quantity }} {{ item.unitName || 'Cái' }}</td>
              <td class="text-center font-weight-medium">
                <span v-if="hasActualReceivedQuantity(item)">{{ item.actualReceivedQuantity }} {{ item.unitName || 'Cái' }}</span>
                <span v-else>-</span>
              </td>
              <td class="text-center">
                <v-chip
                  v-if="getDiscrepancyQuantity(item) !== null && getDiscrepancyQuantity(item) !== 0"
                  size="small"
                  :color="getDiscrepancyQuantity(item) > 0 ? 'warning' : 'error'"
                  variant="tonal"
                >
                  {{ formatDiscrepancy(item) }} {{ item.unitName || 'Cái' }}
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

    <!-- Lịch sử phê duyệt timeline trực tiếp trên trang -->
    <v-card class="mb-6 rounded-lg elevation-1" border>
      <v-card-title class="font-weight-bold bg-grey-lighten-4 py-3">
        <v-icon start>mdi-history</v-icon>
        Lịch sử phê duyệt
      </v-card-title>
      <v-card-text class="pt-4">
        <div v-if="historyList.length === 0" class="text-grey italic text-body-2 text-center py-4">
          Chưa có lịch sử phê duyệt nào cho phiếu này.
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
                <strong>Người thực hiện:</strong> {{ item.actorName || 'Hệ thống' }}
              </div>
              <div v-if="item.note" class="text-body-2 text-error mt-1 italic pl-3 border-left-error">
                Lý do: {{ item.note }}
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
      Tải lại
    </v-btn>
  </div>

  <v-dialog v-model="cancelLateState.open" max-width="500px" persistent>
    <v-card>
      <v-card-title class="text-h6 pt-4 pb-2 px-6">
        Hủy phiếu nhập
        <v-btn icon="mdi-close" variant="text" size="small" class="float-right" :disabled="cancelLateState.submitting" @click="closeCancelLateModal"></v-btn>
      </v-card-title>
      <v-card-text class="px-6 pb-2">
        <p class="mb-4 text-body-2 text-grey-darken-1">Lý do hủy <span class="text-error">*</span></p>
        <v-textarea
          v-model="cancelLateState.reason"
          rows="4"
          variant="outlined"
          density="comfortable"
          placeholder="Nhập lý do hủy..."
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
        <v-btn color="error" variant="flat" :loading="cancelLateState.submitting" @click="confirmCancelLate">Xác nhận hủy</v-btn>
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

