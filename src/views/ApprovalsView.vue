<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import {
  approveImportReceipt,
  getApprovalDetail,
  getPendingApprovals,
  rejectImportReceipt,
} from '../services/importReceiptService'

const router = useRouter()

const receipts = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const actionMessage = ref('')
const actionErrorMessage = ref('')

const page = ref(0)
const size = ref(10)
const totalPages = ref(0)
const totalElements = ref(0)
const filters = reactive({ status: '' })

// Trạng thái thao tác đang chạy theo từng phiếu
const actionState = reactive({ receiptId: null, action: '' })

// Chi tiết phiếu (T96)
const detailState = reactive({ open: false, loading: false, error: '', receipt: null })

// Modal từ chối (T98)
const rejectState = reactive({ open: false, receiptId: null, reason: '', error: '', submitting: false })

const REJECT_REASON_MAX = 500

const columns = [
  { key: 'code', label: 'Mã phiếu' },
  { key: 'warehouseName', label: 'Kho' },
  { key: 'supplierName', label: 'Nhà cung cấp' },
  { key: 'createdByName', label: 'Người tạo' },
  { key: 'submittedAt', label: 'Ngày gửi duyệt' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'totalAmount', label: 'Tổng tiền' },
  { key: 'actions', label: 'Thao tác' },
]

const statusOptions = [
  { value: 'CHO_DUYET_CAP_1', label: 'Chờ duyệt cấp 1' },
  { value: 'CHO_DUYET_CAP_2', label: 'Chờ duyệt cấp 2' },
]

const statusLabels = Object.fromEntries(statusOptions.map(s => [s.value, s.label]))

const hasPreviousPage = computed(() => page.value > 0)
const hasNextPage = computed(() => page.value + 1 < totalPages.value)

onMounted(fetchPendingApprovals)

async function fetchPendingApprovals() {
  isLoading.value = true
  errorMessage.value = ''
  actionMessage.value = ''
  actionErrorMessage.value = ''
  try {
    const data = await getPendingApprovals({
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
  fetchPendingApprovals()
}

function clearFilters() {
  filters.status = ''
  page.value = 0
  fetchPendingApprovals()
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

// ===== T96: Xem chi tiết phiếu chờ duyệt =====
async function openDetail(receipt) {
  detailState.open = true
  detailState.loading = true
  detailState.error = ''
  detailState.receipt = null
  try {
    detailState.receipt = await getApprovalDetail(receipt.id)
  } catch (error) {
    detailState.error = error.message || 'Không thể tải chi tiết phiếu.'
    if (error.status === 401) router.replace('/login')
  } finally {
    detailState.loading = false
  }
}

function closeDetail() {
  detailState.open = false
  detailState.receipt = null
  detailState.error = ''
}

// ===== T97: Duyệt phiếu nhập theo cấp =====
async function handleApprove(receipt) {
  if (!isPendingApproval(receipt.status)) return
  if (!window.confirm(`${approveLabel(receipt.status)} phiếu ${receipt.code}?`)) return

  actionState.receiptId = receipt.id
  actionState.action = 'approve'
  actionMessage.value = ''
  actionErrorMessage.value = ''
  try {
    await approveImportReceipt(receipt.id)
    closeDetail()
    await fetchPendingApprovals()
    actionMessage.value = `Đã duyệt phiếu ${receipt.code} thành công.`
  } catch (error) {
    actionErrorMessage.value = error.message || 'Thao tác thất bại, vui lòng thử lại.'
    if (error.status === 401) router.replace('/login')
  } finally {
    actionState.receiptId = null
    actionState.action = ''
  }
}

// ===== T98: Từ chối phiếu nhập (modal + validate lý do) =====
function openRejectModal(receipt) {
  rejectState.open = true
  rejectState.receiptId = receipt.id
  rejectState.reason = ''
  rejectState.error = ''
  rejectState.submitting = false
}

function closeRejectModal() {
  if (rejectState.submitting) return
  rejectState.open = false
  rejectState.receiptId = null
  rejectState.reason = ''
  rejectState.error = ''
}

async function confirmReject() {
  const reason = rejectState.reason.trim()
  if (!reason) {
    rejectState.error = 'Vui lòng nhập lý do từ chối.'
    return
  }
  if (reason.length > REJECT_REASON_MAX) {
    rejectState.error = `Lý do từ chối không được vượt quá ${REJECT_REASON_MAX} ký tự.`
    return
  }

  rejectState.submitting = true
  rejectState.error = ''
  actionMessage.value = ''
  actionErrorMessage.value = ''
  try {
    await rejectImportReceipt(rejectState.receiptId, reason)
    rejectState.open = false
    rejectState.submitting = false
    closeDetail()
    await fetchPendingApprovals()
    actionMessage.value = 'Đã từ chối phiếu nhập thành công.'
  } catch (error) {
    rejectState.submitting = false
    rejectState.error = error.message || 'Không thể từ chối phiếu nhập.'
    if (error.status === 401) router.replace('/login')
  }
}

function isPendingApproval(status) {
  return status === 'CHO_DUYET_CAP_1' || status === 'CHO_DUYET_CAP_2'
}

function approveLabel(status) {
  if (status === 'CHO_DUYET_CAP_1') return 'Duyệt cấp 1'
  if (status === 'CHO_DUYET_CAP_2') return 'Duyệt cấp 2'
  return 'Duyệt'
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

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '-'
  return Number(value || 0).toLocaleString('vi-VN') + ' đ'
}
</script>

<template>
  <PageHeader title="Phiếu nhập chờ duyệt" description="Quản lý duyệt/từ chối phiếu nhập kho theo cấp." />

  <div class="filter-bar card card-pad">
    <select v-model="filters.status" class="select" @change="applyFilter">
      <option value="">Tất cả cấp chờ duyệt</option>
      <option v-for="status in statusOptions" :key="status.value" :value="status.value">{{ status.label }}</option>
    </select>
    <button class="btn btn-ghost" type="button" @click="clearFilters">Xóa lọc</button>
  </div>

  <p v-if="errorMessage" class="form-alert form-alert-error">{{ errorMessage }}</p>
  <p v-if="actionErrorMessage" class="form-alert form-alert-error">{{ actionErrorMessage }}</p>
  <p v-if="actionMessage" class="form-alert form-alert-info">{{ actionMessage }}</p>
  <p v-if="isLoading" class="muted loading-line">Đang tải danh sách phiếu chờ duyệt...</p>

  <DataTable :columns="columns" :rows="receipts" empty-text="Không có phiếu nào đang chờ duyệt">
    <template #warehouseName="{ value }">{{ value || '-' }}</template>
    <template #supplierName="{ value }">{{ value || '-' }}</template>
    <template #createdByName="{ value }">{{ value || '-' }}</template>
    <template #submittedAt="{ value }">{{ formatDateTime(value) }}</template>
    <template #status="{ value }">
      <span class="badge" :class="statusClass(value)">{{ statusLabel(value) }}</span>
    </template>
    <template #totalAmount="{ value }">{{ formatCurrency(value) }}</template>
    <template #actions="{ row }">
      <div class="actions">
        <button class="btn btn-sm" type="button" :disabled="isAnyActionRunning(row)" @click="openDetail(row)">Xem</button>
        <button class="btn btn-sm btn-primary" type="button" :disabled="isAnyActionRunning(row)" @click="handleApprove(row)">
          {{ isActionRunning(row, 'approve') ? 'Đang duyệt...' : approveLabel(row.status) }}
        </button>
        <button class="btn btn-sm btn-danger" type="button" :disabled="isAnyActionRunning(row)" @click="openRejectModal(row)">Từ chối</button>
      </div>
    </template>
  </DataTable>

  <div class="pagination-bar card card-pad">
    <span class="muted">{{ totalElements }} phiếu chờ duyệt</span>
    <div class="pagination-actions">
      <button class="btn btn-sm" type="button" :disabled="!hasPreviousPage" @click="previousPage">Trước</button>
      <span class="page-indicator">Trang {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span>
      <button class="btn btn-sm" type="button" :disabled="!hasNextPage" @click="nextPage">Sau</button>
    </div>
  </div>

  <!-- T96: Modal chi tiết phiếu cho quản lý -->
  <div v-if="detailState.open" class="modal-backdrop">
    <div class="modal detail-modal">
      <div class="modal-head between">
        <h2 class="section-title">Chi tiết phiếu nhập chờ duyệt</h2>
        <button class="btn btn-icon" aria-label="Đóng" @click="closeDetail"><i class="mdi mdi-close"></i></button>
      </div>
      <div class="modal-body">
        <p v-if="detailState.loading" class="muted">Đang tải chi tiết phiếu...</p>
        <p v-else-if="detailState.error" class="form-alert form-alert-error">{{ detailState.error }}</p>

        <template v-else-if="detailState.receipt">
          <div class="detail-grid">
            <div><span class="detail-label">Mã phiếu</span><span class="detail-value">{{ detailState.receipt.code }}</span></div>
            <div>
              <span class="detail-label">Trạng thái</span>
              <span class="badge" :class="statusClass(detailState.receipt.status)">{{ statusLabel(detailState.receipt.status) }}</span>
            </div>
            <div><span class="detail-label">Kho</span><span class="detail-value">{{ detailState.receipt.warehouseName || '-' }}</span></div>
            <div><span class="detail-label">Nhà cung cấp</span><span class="detail-value">{{ detailState.receipt.supplierName || '-' }}</span></div>
            <div><span class="detail-label">Người tạo</span><span class="detail-value">{{ detailState.receipt.createdByName || '-' }}</span></div>
            <div><span class="detail-label">Người gửi duyệt</span><span class="detail-value">{{ detailState.receipt.submittedByName || '-' }}</span></div>
            <div><span class="detail-label">Ngày gửi duyệt</span><span class="detail-value">{{ formatDateTime(detailState.receipt.submittedAt) }}</span></div>
            <div><span class="detail-label">Tổng tiền</span><span class="detail-value">{{ formatCurrency(detailState.receipt.totalAmount) }}</span></div>
            <div class="detail-span-2"><span class="detail-label">Ghi chú</span><span class="detail-value">{{ detailState.receipt.note || '-' }}</span></div>
          </div>

          <h3 class="detail-section-title">Danh sách sản phẩm</h3>
          <div class="table-wrap card">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mã SP</th>
                  <th>Tên sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!detailState.receipt.details || detailState.receipt.details.length === 0">
                  <td colspan="5" class="empty-cell">Phiếu chưa có sản phẩm</td>
                </tr>
                <tr v-for="item in detailState.receipt.details" :key="item.id">
                  <td>{{ item.productCode || '-' }}</td>
                  <td>{{ item.productName || '-' }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ formatCurrency(item.unitPrice) }}</td>
                  <td>{{ formatCurrency(item.lineTotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
      <div v-if="detailState.receipt && isPendingApproval(detailState.receipt.status)" class="modal-foot">
        <button class="btn btn-danger" type="button" @click="openRejectModal(detailState.receipt)">Từ chối</button>
        <button class="btn btn-primary" type="button" @click="handleApprove(detailState.receipt)">{{ approveLabel(detailState.receipt.status) }}</button>
      </div>
    </div>
  </div>

  <!-- T98: Modal từ chối phiếu nhập -->
  <div v-if="rejectState.open" class="modal-backdrop">
    <div class="modal small-modal">
      <div class="modal-head between">
        <h2 class="section-title">Từ chối phiếu nhập</h2>
        <button class="btn btn-icon" aria-label="Đóng" :disabled="rejectState.submitting" @click="closeRejectModal"><i class="mdi mdi-close"></i></button>
      </div>
      <div class="modal-body">
        <label class="field-label" for="reject-reason">Lý do từ chối <span class="required">*</span></label>
        <textarea
          id="reject-reason"
          v-model="rejectState.reason"
          class="textarea"
          rows="4"
          :maxlength="REJECT_REASON_MAX"
          placeholder="Nhập lý do từ chối để nhân viên lập phiếu nắm được nguyên nhân..."
          @input="rejectState.error = ''"
        ></textarea>
        <div class="reason-meta">
          <span v-if="rejectState.error" class="reason-error">{{ rejectState.error }}</span>
          <span class="reason-count">{{ rejectState.reason.length }}/{{ REJECT_REASON_MAX }}</span>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" type="button" :disabled="rejectState.submitting" @click="closeRejectModal">Hủy</button>
        <button class="btn btn-danger" type="button" :disabled="rejectState.submitting" @click="confirmReject">
          {{ rejectState.submitting ? 'Đang gửi...' : 'Xác nhận từ chối' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-line { margin: 8px 0 14px; }
.form-alert { margin: 0 0 12px; padding: 10px 12px; border-radius: 8px; line-height: 20px; }
.form-alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.form-alert-info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
.badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 9px; font-size: 12px; font-weight: 800; white-space: nowrap; background: #f1f5f9; color: #475569; }
.status-cho-duyet-cap-1, .status-cho-duyet-cap-2, .status-cho-hang-ve, .status-cho-kiem-hang { background: #fef3c7; color: #b45309; }
.status-tu-choi { background: #fee2e2; color: #b91c1c; }
.status-hoan-thanh { background: #dcfce7; color: #15803d; }
.status-nhap, .status-huy { background: #f1f5f9; color: #475569; }
.pagination-bar { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pagination-actions { display: flex; align-items: center; gap: 10px; }
.page-indicator { color: var(--muted); font-weight: 600; }

.detail-modal { width: min(760px, 100%); }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; margin-bottom: 18px; }
.detail-grid > div { display: flex; flex-direction: column; gap: 2px; }
.detail-span-2 { grid-column: 1 / -1; }
.detail-label { font-size: 12px; color: var(--muted); font-weight: 600; }
.detail-value { font-size: 14px; font-weight: 600; }
.detail-section-title { margin: 8px 0 10px; font-size: 14px; font-weight: 800; }
.empty-cell { text-align: center; color: var(--muted); padding: 24px; }

.small-modal { width: min(460px, 100%); }
.field-label { display: block; font-weight: 700; margin-bottom: 6px; }
.required { color: #b91c1c; }
.textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font: inherit; resize: vertical; }
.reason-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; gap: 12px; }
.reason-error { color: #b91c1c; font-size: 13px; }
.reason-count { color: var(--muted); font-size: 12px; margin-left: auto; }

@media (max-width: 640px) {
  .detail-grid { grid-template-columns: 1fr; }
  .pagination-bar { align-items: flex-start; flex-direction: column; }
}
</style>
