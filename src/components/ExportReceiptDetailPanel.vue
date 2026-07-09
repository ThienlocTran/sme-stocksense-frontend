<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { getCurrentRoleCode } from '../services/authService'
import { getExportReceiptDetails, cancelDraft, submitForApproval } from '../services/exportReceiptService'

const props = defineProps({
  receiptId: { type: [Number, String], required: true }
})

const router = useRouter()
const isLoading = ref(true)
const errorMessage = ref('')
const actionMessage = ref('')
const actionErrorMessage = ref('')

// State lưu trữ dữ liệu phiếu xuất
const receipt = ref(null)

// Trạng thái nút thao tác
const actionState = reactive({ isProcessing: false, currentAction: '' })
const confirmState = reactive({ open: false, action: '' })

// Thông tin Role để phân quyền
const currentRole = computed(() => getCurrentRoleCode())

onMounted(() => {
  loadReceiptDetails()
})

// Logic: Gọi API lấy chi tiết phiếu xuất (T120)
async function loadReceiptDetails() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const data = await getExportReceiptDetails(props.receiptId)
    receipt.value = data
  } catch (err) {
    errorMessage.value = err.message || 'Không thể tải chi tiết phiếu xuất.'
    if (err.status === 401) router.replace('/login')
  } finally {
    isLoading.value = false
  }
}

// Logic: Chuyển hướng về Danh sách
function goBack() {
  router.push('/stock-out')
}

// Logic: Chuyển hướng qua trang Sửa
function goEdit() {
  router.push(`/stock-out/${props.receiptId}/edit`)
}

// Logic: In Phiếu (Mockup phase 1)
function printReceipt() {
  actionMessage.value = ''
  actionErrorMessage.value = ''
  // Hiện tại chỉ show Toast
  actionMessage.value = 'Chức năng In PDF đang được phát triển.'
  setTimeout(() => { actionMessage.value = '' }, 3000)
}

// Validation phân quyền thao tác
function canEdit() {
  if (!receipt.value) return false
  if (!['ADMIN', 'EMPLOYEE'].includes(currentRole.value)) return false
  return receipt.value.status === 'NHAP' || receipt.value.status === 'TU_CHOI'
}

function canSubmit() {
  return canEdit()
}

function canCancel() {
  if (!receipt.value) return false
  if (!['ADMIN', 'EMPLOYEE'].includes(currentRole.value)) return false
  return receipt.value.status === 'NHAP'
}

// Logic: Mở Modal Xác nhận
function promptSubmit() {
  confirmState.action = 'submit'
  confirmState.open = true
}

function promptCancel() {
  confirmState.action = 'cancel'
  confirmState.open = true
}

function closeConfirmDialog() {
  confirmState.open = false
  confirmState.action = ''
}

// Logic: Handle khi ấn OK trên Modal
async function confirmAction() {
  const action = confirmState.action
  closeConfirmDialog()
  
  if (action === 'submit') {
    await executeSubmit()
  } else if (action === 'cancel') {
    await executeCancel()
  }
}

// Logic: Gọi API Gửi Duyệt
async function executeSubmit() {
  actionState.isProcessing = true
  actionState.currentAction = 'submit'
  actionMessage.value = ''
  actionErrorMessage.value = ''

  try {
    await submitForApproval(receipt.value.id, { version: receipt.value.version })
    actionMessage.value = 'Gửi duyệt phiếu xuất thành công.'
    // Tự động reload data để cập nhật Badge Status (ẩn nút thao tác)
    await loadReceiptDetails()
  } catch (err) {
    actionErrorMessage.value = err.message || 'Lỗi khi gửi duyệt.'
  } finally {
    actionState.isProcessing = false
    actionState.currentAction = ''
  }
}

// Logic: Gọi API Hủy Phiếu Nháp
async function executeCancel() {
  actionState.isProcessing = true
  actionState.currentAction = 'cancel'
  actionMessage.value = ''
  actionErrorMessage.value = ''

  try {
    await cancelDraft(receipt.value.id)
    actionMessage.value = 'Đã hủy phiếu xuất thành công.'
    // Tự động reload data
    await loadReceiptDetails()
  } catch (err) {
    actionErrorMessage.value = err.message || 'Lỗi khi hủy phiếu.'
  } finally {
    actionState.isProcessing = false
    actionState.currentAction = ''
  }
}

// Format Helper
function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  }).format(date)
}

const statusOptions = {
  'NHAP': { label: 'Nháp', class: 'status-nhap' },
  'CHO_DUYET_CAP_1': { label: 'Chờ quản lý duyệt', class: 'status-cho-duyet-cap-1' },
  'CHO_DUYET_CAP_2': { label: 'Chờ quản lý duyệt', class: 'status-cho-duyet-cap-2' },
  'HOAN_THANH': { label: 'Hoàn thành', class: 'status-hoan-thanh' },
  'TU_CHOI': { label: 'Từ chối', class: 'status-tu-choi' },
  'HUY': { label: 'Hủy', class: 'status-huy' }
}

function getStatusLabel(status) {
  return statusOptions[status]?.label || status || '-'
}

function getStatusClass(status) {
  return statusOptions[status]?.class || 'status-nhap'
}
</script>

<template>
  <div class="navigation-bar">
    <button class="btn btn-ghost btn-back" @click="goBack">
      <i class="mdi mdi-arrow-left"></i> Quay lại danh sách
    </button>
  </div>

  <div v-if="isLoading" class="loading-state">
    <div class="spinner"></div> Đang tải thông tin chi tiết...
  </div>
  
  <div v-else-if="errorMessage" class="card card-pad error-container">
    <p class="form-alert form-alert-error mb-0">{{ errorMessage }}</p>
  </div>
  
  <div v-else-if="receipt" class="detail-container card">
    <!-- Header Controls -->
    <div class="detail-header-actions">
      <h2 class="title">Chi tiết Phiếu Xuất #{{ receipt.code || receipt.id }}</h2>
      <div class="actions-group">
        <!-- Nút thao tác nhanh (Chỉ hiện khi hợp lệ) -->
        <button v-if="canEdit()" class="btn btn-outline" @click="goEdit" :disabled="actionState.isProcessing">
          <i class="mdi mdi-pencil"></i> Sửa phiếu
        </button>
        <button v-if="canSubmit()" class="btn btn-primary" @click="promptSubmit" :disabled="actionState.isProcessing">
          <i class="mdi mdi-send"></i> 
          {{ actionState.isProcessing && actionState.currentAction === 'submit' ? 'Đang gửi...' : 'Gửi duyệt' }}
        </button>
        <button v-if="canCancel()" class="btn btn-outline text-danger" @click="promptCancel" :disabled="actionState.isProcessing">
          <i class="mdi mdi-delete"></i> 
          {{ actionState.isProcessing && actionState.currentAction === 'cancel' ? 'Đang hủy...' : 'Hủy phiếu' }}
        </button>
        <button class="btn btn-ghost" @click="printReceipt">
          <i class="mdi mdi-printer"></i> In phiếu
        </button>
      </div>
    </div>

    <!-- Alert Messages -->
    <div class="detail-alerts">
      <p v-if="actionErrorMessage" class="form-alert form-alert-error">{{ actionErrorMessage }}</p>
      <p v-if="actionMessage" class="form-alert form-alert-success">{{ actionMessage }}</p>
      
      <!-- Cảnh báo Lý do từ chối -->
      <div v-if="receipt.status === 'TU_CHOI' && receipt.rejectionReason" class="rejection-alert">
        <strong>Lý do từ chối:</strong> {{ receipt.rejectionReason }}
      </div>
    </div>

    <!-- Thông tin chung (Panel) -->
    <div class="info-panel">
      <div class="info-group">
        <label>Trạng thái</label>
        <span class="badge" :class="getStatusClass(receipt.status)">{{ getStatusLabel(receipt.status) }}</span>
      </div>
      <div class="info-group">
        <label>Kho xuất</label>
        <span>{{ receipt.warehouseName || '-' }}</span>
      </div>
      <div class="info-group">
        <label>Người tạo</label>
        <span>{{ receipt.createdBy || '-' }}</span>
      </div>
      <div class="info-group">
        <label>Thời gian tạo</label>
        <span>{{ formatDate(receipt.createdAt) }}</span>
      </div>
      <div class="info-group full-width">
        <label>Ghi chú</label>
        <p class="note-text">{{ receipt.note || 'Không có ghi chú' }}</p>
      </div>
    </div>

    <hr class="divider" />

    <!-- Danh sách Sản phẩm -->
    <div class="products-section">
      <h3>Sản phẩm xuất kho</h3>
      
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th width="15%">Mã SP</th>
              <th width="35%">Tên SP</th>
              <th width="15%">ĐVT</th>
              <th width="15%">SL Xuất</th>
              <th width="20%">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in receipt.details" :key="item.productId">
              <td><strong>{{ item.productCode }}</strong></td>
              <td>{{ item.productName }}</td>
              <td>{{ item.unitName || '-' }}</td>
              <td><span class="qty-badge">{{ item.quantity }}</span></td>
              <td><span class="muted">{{ item.note || '-' }}</span></td>
            </tr>
            <tr v-if="!receipt.details || receipt.details.length === 0">
              <td colspan="5" class="text-center muted">Không có sản phẩm nào.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <ConfirmDialog
    :open="confirmState.open"
    :title="confirmState.action === 'submit' ? 'Xác nhận Gửi duyệt' : 'Xác nhận Hủy phiếu'"
    :message="confirmState.action === 'submit' ? 'Bạn có chắc chắn muốn gửi duyệt phiếu xuất này không?' : 'Bạn có chắc chắn muốn hủy phiếu xuất này không? (Không thể hoàn tác)'"
    :confirm-text="confirmState.action === 'submit' ? 'Gửi duyệt' : 'Hủy phiếu'"
    :danger="confirmState.action === 'cancel'"
    @confirm="confirmAction"
    @cancel="closeConfirmDialog"
  />
</template>

<style scoped>
/* @design-taste-frontend: Micro-animations and Layout aesthetics */
.navigation-bar { margin-bottom: 16px; }
.btn-back { display: inline-flex; align-items: center; gap: 6px; color: #64748b; font-weight: 600; padding: 6px 12px; border-radius: 8px; transition: all 0.2s ease; }
.btn-back:hover { color: #0f172a; background: #f1f5f9; transform: translateX(-2px); }

.detail-container { padding: 24px; border-radius: 12px; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }

.detail-header-actions { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
.title { margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; }
.actions-group { display: flex; gap: 10px; flex-wrap: wrap; }

.info-panel { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
.info-group { display: flex; flex-direction: column; gap: 4px; }
.info-group.full-width { grid-column: 1 / -1; }
.info-group label { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.info-group span, .info-group p { font-size: 15px; color: #1e293b; font-weight: 500; }
.note-text { margin: 0; white-space: pre-wrap; line-height: 1.5; }

.rejection-alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 20px; color: #991b1b; font-size: 14px; border-radius: 4px; }

.divider { margin: 28px 0; border: 0; height: 1px; background: #e2e8f0; }

.products-section h3 { margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #0f172a; }

.data-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.data-table th { background: #f1f5f9; padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.02em; border-bottom: 2px solid #e2e8f0; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #1e293b; vertical-align: middle; }
.data-table tbody tr:hover { background-color: #f8fafc; }

.qty-badge { display: inline-flex; align-items: center; justify-content: center; background: #eff6ff; color: #1d4ed8; font-weight: 700; padding: 4px 10px; border-radius: 6px; }

/* Badges */
.badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 12px; font-size: 13px; font-weight: 700; white-space: nowrap; transition: all 0.3s ease; }
.status-nhap, .status-huy { background: #f1f5f9; color: #475569; }
.status-cho-duyet-cap-1, .status-cho-duyet-cap-2 { background: #fef3c7; color: #b45309; }
.status-tu-choi { background: #fee2e2; color: #b91c1c; }
.status-hoan-thanh { background: #dcfce7; color: #15803d; }

/* Buttons & Utils */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 16px; font-weight: 600; font-size: 14px; border-radius: 8px; border: none; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.btn:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
.btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }
.btn-outline:hover:not(:disabled) { border-color: #94a3b8; background: #f8fafc; color: #0f172a; }
.btn-ghost { background: transparent; color: #64748b; }
.btn-ghost:hover:not(:disabled) { background: #f1f5f9; color: #334155; }
.text-danger { color: #ef4444 !important; border-color: #fca5a5 !important; }
.text-danger:hover:not(:disabled) { background: #fef2f2 !important; color: #b91c1c !important; border-color: #f87171 !important; }

.form-alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
.form-alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.form-alert-success { background: #f0fdfa; color: #0f766e; border: 1px solid #ccfbf1; }

.loading-state { padding: 40px; text-align: center; color: #64748b; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 12px; }
.spinner { width: 20px; height: 20px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
