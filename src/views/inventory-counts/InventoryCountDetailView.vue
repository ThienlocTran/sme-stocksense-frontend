<script setup>
import { computed, onMounted, ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../../components/PageHeader.vue'
import DataTable from '../../components/DataTable.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import {
  getInventoryCountById,
  updateInventoryCountDetail,
  finalizeInventoryCount,
  cancelInventoryCount
} from '../../services/inventoryCountService'
import { canManageInventoryCounts } from '../../services/permissionService'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const countId = Number(route.params.id)

const count = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')
const savingDetailId = ref(null)

// Confirmation dialog states
const isFinalizeOpen = ref(false)
const isFinalizeLoading = ref(false)

const isCancelOpen = ref(false)
const isCancelLoading = ref(false)
const cancelReason = ref('')
const cancelErrorMessage = ref('')
const savingAll = ref(false)

// Local edit values
const localActuals = ref({})
const localNotes = ref({})

const toast = reactive({
  show: false,
  message: '',
  color: 'success'
})

function showToast(message, color = 'success') {
  toast.message = message
  toast.color = color
  toast.show = true
}

const authStore = useAuthStore()
const canManage = computed(() => canManageInventoryCounts(authStore.currentUser))
const isActive = computed(() => count.value && count.value.status === 'DANG_KIEM_KE')

const columns = [
  { key: 'productCode', label: 'Mã SP', class: 'cell-compact' },
  { key: 'productName', label: 'Tên sản phẩm' },
  { key: 'systemQuantity', label: 'Tồn hệ thống', class: 'cell-right' },
  { key: 'actualQuantity', label: 'Thực tế', class: 'cell-nowrap' },
  { key: 'differenceQuantity', label: 'Chênh lệch', class: 'cell-right' },
  { key: 'note', label: 'Ghi chú' },
  { key: 'actions', label: 'Lưu', class: 'cell-compact' }
]

onMounted(fetchDetail)

async function fetchDetail() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const data = await getInventoryCountById(countId)
    count.value = data
    // Initialize inputs
    if (data.details) {
      data.details.forEach(d => {
        localActuals.value[d.id] = d.actualQuantity !== null ? d.actualQuantity : ''
        localNotes.value[d.id] = d.note || ''
      })
    }
  } catch (error) {
    errorMessage.value = error.message || 'Không thể tải chi tiết đợt kiểm kê.'
  } finally {
    isLoading.value = false
  }
}

async function saveAllLines() {
  if (!isActive.value || !count.value || !count.value.details) return

  const modifiedLines = []
  
  for (const d of count.value.details) {
    const localActual = localActuals.value[d.id]
    const localNote = localNotes.value[d.id]
    
    const origActual = d.actualQuantity !== null ? d.actualQuantity : ''
    const origNote = d.note || ''
    
    const isModified = localActual !== origActual || localNote !== origNote
    
    if (isModified) {
      if (localActual === '' || localActual === null || localActual === undefined) {
        showToast(`Dòng sản phẩm ${d.productCode} chưa nhập số lượng thực tế hợp lệ.`, 'error')
        return
      }
      const actualQty = Number(localActual)
      if (isNaN(actualQty) || actualQty < 0) {
        showToast(`Số lượng dòng ${d.productCode} phải là số nguyên >= 0.`, 'error')
        return
      }
      
      modifiedLines.push({
        detail: d,
        actualQuantity: actualQty,
        note: localNote ? localNote.trim() : null
      })
    }
  }

  if (modifiedLines.length === 0) {
    showToast('Không có thay đổi nào để lưu.', 'info')
    return
  }

  savingAll.value = true
  let successCount = 0
  let failCount = 0
  let lastErrorMessage = ''

  const savePromises = modifiedLines.map(async ({ detail, actualQuantity, note }) => {
    try {
      const payload = {
        actualQuantity,
        note,
        version: detail.version
      }
      await updateInventoryCountDetail(countId, detail.id, payload)
      successCount++
    } catch (err) {
      failCount++
      lastErrorMessage = err.message || `Lỗi khi lưu dòng ${detail.productCode}`
    }
  })

  await Promise.allSettled(savePromises)

  // Reload details after saving
  try {
    const data = await getInventoryCountById(countId)
    count.value = data
    if (data.details) {
      data.details.forEach(d => {
        localActuals.value[d.id] = d.actualQuantity !== null ? d.actualQuantity : ''
        localNotes.value[d.id] = d.note || ''
      })
    }
  } catch (error) {
    console.error('Không thể tải lại chi tiết:', error)
  }

  savingAll.value = false

  if (failCount === 0) {
    showToast(`Đã lưu thành công tất cả ${successCount} dòng thay đổi!`, 'success')
  } else if (successCount > 0) {
    showToast(`Đã lưu ${successCount} dòng thành công, ${failCount} dòng thất bại. Lỗi cuối: ${lastErrorMessage}`, 'error')
  } else {
    showToast(`Lưu thất bại. Lỗi: ${lastErrorMessage}`, 'error')
  }
}

async function saveLine(detail) {
  const actualVal = localActuals.value[detail.id]
  if (actualVal === '' || actualVal === null || actualVal === undefined) {
    showToast('Vui lòng nhập số lượng thực tế hợp lệ.', 'error')
    return
  }
  const actualQty = Number(actualVal)
  if (isNaN(actualQty) || actualQty < 0) {
    showToast('Số lượng thực tế phải là số nguyên lớn hơn hoặc bằng 0.', 'error')
    return
  }

  savingDetailId.value = detail.id
  try {
    const payload = {
      actualQuantity: actualQty,
      note: localNotes.value[detail.id] ? localNotes.value[detail.id].trim() : null,
      version: detail.version
    }
    const updatedCount = await updateInventoryCountDetail(countId, detail.id, payload)
    
    // Update count state and refresh local inputs
    count.value = updatedCount
    if (updatedCount.details) {
      updatedCount.details.forEach(d => {
        localActuals.value[d.id] = d.actualQuantity !== null ? d.actualQuantity : ''
        localNotes.value[d.id] = d.note || ''
      })
    }
    showToast('Cập nhật số lượng dòng này thành công!', 'success')
  } catch (error) {
    showToast(error.message || 'Không thể cập nhật số lượng dòng này.', 'error')
  } finally {
    savingDetailId.value = null
  }
}

function openFinalize() {
  // Check if all lines have actual quantities
  if (count.value.details.some(d => d.actualQuantity === null)) {
    showToast('Bạn phải nhập số lượng thực tế cho tất cả sản phẩm trước khi chốt kiểm kê.', 'error')
    return
  }
  isFinalizeOpen.value = true
}

async function handleFinalize() {
  isFinalizeLoading.value = true
  try {
    const updated = await finalizeInventoryCount(countId, { version: count.value.version })
    count.value = updated
    isFinalizeOpen.value = false
    showToast('Chốt đợt kiểm kê thành công!', 'success')
  } catch (error) {
    showToast(error.message || 'Chốt kiểm kê thất bại.', 'error')
  } finally {
    isFinalizeLoading.value = false
  }
}

function openCancel() {
  cancelReason.value = ''
  cancelErrorMessage.value = ''
  isCancelOpen.value = true
}

async function handleCancel() {
  if (!cancelReason.value.trim()) {
    cancelErrorMessage.value = 'Vui lòng nhập lý do hủy đợt kiểm kê.'
    return
  }
  isCancelLoading.value = true
  cancelErrorMessage.value = ''
  try {
    const updated = await cancelInventoryCount(countId, {
      reason: cancelReason.value.trim(),
      version: count.value.version
    })
    count.value = updated
    isCancelOpen.value = false
    showToast('Hủy đợt kiểm kê thành công!', 'success')
  } catch (error) {
    cancelErrorMessage.value = error.message || 'Không thể hủy đợt kiểm kê.'
  } finally {
    isCancelLoading.value = false
  }
}

function getStatusText(status) {
  if (status === 'DANG_KIEM_KE') return 'Đang kiểm kê'
  if (status === 'DA_CHOT') return 'Đã chốt'
  if (status === 'DA_HUY') return 'Đã hủy'
  return status
}

function getDiffClass(diff) {
  if (diff > 0) return 'text-success font-semibold'
  if (diff < 0) return 'text-danger font-semibold'
  return 'text-muted'
}

function getDiffText(diff) {
  if (diff > 0) return `+${diff}`
  return String(diff)
}

function formatDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="page-container">
    <PageHeader :title="count ? `Chi tiết kiểm kê: ${count.code}` : 'Chi tiết kiểm kê'" description="Theo dõi đối soát và cập nhật số lượng tồn kho thực tế.">
      <div class="flex items-center gap-2">
        <button class="btn btn-outline" @click="router.push('/inventory-counts')">
          <i class="mdi mdi-arrow-left"></i> Quay lại danh sách
        </button>
        <template v-if="isActive && canManage">
          <button class="btn btn-danger" @click="openCancel">
            <i class="mdi mdi-close-circle-outline"></i> Hủy kiểm kê
          </button>
          <button class="btn btn-primary" @click="openFinalize">
            <i class="mdi mdi-check-all"></i> Chốt kiểm kê
          </button>
        </template>
      </div>
    </PageHeader>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <i class="mdi mdi-loading mdi-spin"></i> Đang tải dữ liệu...
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="error-alert">
      {{ errorMessage }}
      <button class="btn btn-outline ml-4" @click="fetchDetail">Thử lại</button>
    </div>

    <!-- Main Content -->
    <div v-else-if="count" class="detail-grid">
      <!-- Session Metadata Card -->
      <div class="card card-pad mb-6">
        <h3 class="card-title">Thông tin đợt kiểm kê</h3>
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Kho hàng</span>
            <span class="meta-value">{{ count.warehouseName }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Trạng thái</span>
            <span class="meta-value"><StatusBadge :status="getStatusText(count.status)" /></span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Người tạo</span>
            <span class="meta-value">{{ count.createdByName }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Ngày tạo</span>
            <span class="meta-value">{{ formatDate(count.createdAt) }}</span>
          </div>

          <!-- Conditionally display finalize details -->
          <div class="meta-item" v-if="count.status === 'DA_CHOT'">
            <span class="meta-label">Ngày chốt</span>
            <span class="meta-value text-success font-semibold">{{ formatDate(count.finalizedAt) }}</span>
          </div>

          <!-- Conditionally display cancel details -->
          <div class="meta-item col-span-2" v-if="count.status === 'DA_HUY'">
            <span class="meta-label">Lý do hủy (Ngày hủy: {{ formatDate(count.cancelledAt) }})</span>
            <span class="meta-value text-danger">{{ count.cancellationReason || 'Không có lý do' }}</span>
          </div>

          <div class="meta-item col-span-2">
            <span class="meta-label">Ghi chú</span>
            <span class="meta-value">{{ count.note || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Detail Lines Table Card -->
      <div class="card">
        <div class="card-header border-b px-6 py-4 flex items-center justify-between">
          <h3 class="card-title mb-0">Danh sách sản phẩm kiểm kê</h3>
          <span class="text-sm text-zinc-500 font-medium" v-if="count.details">Tổng số mặt hàng: {{ count.details.length }}</span>
        </div>

        <DataTable :columns="columns" :rows="count.details">
          <template #actions-header>
            <button
              v-if="isActive"
              class="btn btn-primary btn-sm flex items-center gap-1"
              @click="saveAllLines"
              :disabled="savingAll"
              title="Lưu tất cả thay đổi"
              style="padding: 4px 8px; font-size: 12px; line-height: 1.2; text-transform: none; font-weight: 600;"
            >
              <i class="mdi" :class="savingAll ? 'mdi-loading mdi-spin' : 'mdi-content-save-all'"></i>
              Lưu
            </button>
            <span v-else>Lưu</span>
          </template>
          <template #productCode="{ row }">
            <span class="font-semibold text-zinc-900">{{ row.productCode }}</span>
          </template>
          <template #systemQuantity="{ row }">
            <span class="font-medium text-zinc-700">{{ row.systemQuantity }}</span>
          </template>
          <template #actualQuantity="{ row }">
            <div class="flex items-center gap-2" v-if="isActive">
              <input
                type="number"
                min="0"
                class="input actual-input"
                v-model.number="localActuals[row.id]"
                placeholder="Nhập số thực"
              />
            </div>
            <span v-else class="font-medium">{{ row.actualQuantity !== null ? row.actualQuantity : '—' }}</span>
          </template>
          <template #differenceQuantity="{ row }">
            <span v-if="row.actualQuantity !== null" :class="getDiffClass(row.differenceQuantity)">
              {{ getDiffText(row.differenceQuantity) }}
            </span>
            <span v-else class="text-zinc-400">—</span>
          </template>
          <template #note="{ row }">
            <input
              v-if="isActive"
              type="text"
              class="input note-input"
              v-model="localNotes[row.id]"
              placeholder="Ghi chú thêm (thiếu, hỏng...)"
            />
            <span v-else>{{ row.note || '—' }}</span>
          </template>
          <template #actions="{ row }">
            <button
              v-if="isActive"
              class="btn btn-ghost btn-sm"
              @click="saveLine(row)"
              :disabled="savingDetailId === row.id"
              title="Lưu số lượng dòng này"
            >
              <i class="mdi" :class="savingDetailId === row.id ? 'mdi-loading mdi-spin' : 'mdi-content-save'"></i>
            </button>
            <span v-else>—</span>
          </template>
        </DataTable>
      </div>
    </div>

    <!-- Finalize Confirm Dialog -->
    <ConfirmDialog
      :open="isFinalizeOpen"
      title="Chốt đợt kiểm kê"
      message="Chốt kiểm kê sẽ cập nhật tồn kho theo số lượng thực tế đã nhập. Thao tác này có thể làm thay đổi số lượng tồn hiện tại. Bạn có chắc chắn muốn chốt không?"
      confirmText="Xác nhận chốt"
      :loading="isFinalizeLoading"
      @cancel="isFinalizeOpen = false"
      @confirm="handleFinalize"
    />

    <!-- Cancel Confirm Dialog -->
    <ConfirmDialog
      :open="isCancelOpen"
      title="Hủy đợt kiểm kê"
      message="Bạn có chắc chắn muốn hủy đợt kiểm kê này không? Tất cả các thay đổi sẽ không được cập nhật vào kho hàng."
      confirmText="Xác nhận hủy"
      danger
      :loading="isCancelLoading"
      @cancel="isCancelOpen = false"
      @confirm="handleCancel"
    >
      <div class="form-group mt-4">
        <label class="label required">Lý do hủy</label>
        <textarea class="textarea" v-model="cancelReason" placeholder="Nhập lý do hủy..."></textarea>
        <span v-if="cancelErrorMessage" class="text-danger text-xs mt-1 block">{{ cancelErrorMessage }}</span>
      </div>
    </ConfirmDialog>

    <!-- Toast Notification Success/Error -->
    <v-snackbar
      v-model="toast.show"
      :color="toast.color"
      timeout="3000"
      rounded="xl"
      elevation="4"
    >
      <div class="flex items-center gap-2">
        <i class="mdi" :class="toast.color === 'success' ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline'"></i>
        <span>{{ toast.message }}</span>
      </div>
    </v-snackbar>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
}
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px;
  font-weight: 500;
  color: #64748b;
}
.error-alert {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}
.ml-4 {
  margin-left: 16px;
}
.font-semibold {
  font-weight: 600;
}
.font-medium {
  font-weight: 500;
}
.text-zinc-900 {
  color: #18181b;
}
.text-zinc-500 {
  color: #71717a;
}
.text-zinc-700 {
  color: #3f3f46;
}
.card-header {
  border-bottom: 1px solid #f1f5f9;
}
.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.col-span-2 {
  grid-column: span 2;
}
.meta-item {
  display: flex;
  flex-direction: column;
}
.meta-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.meta-value {
  font-size: 14px;
  color: #0f172a;
  font-weight: 500;
}
.actual-input {
  width: 120px;
  padding: 6px 12px;
}
.note-input {
  width: 100%;
  min-width: 180px;
  padding: 6px 12px;
}
.text-success {
  color: #15803d;
}
.text-danger {
  color: #b91c1c;
}
.text-muted {
  color: #64748b;
}
.cell-right {
  text-align: right;
}
.btn-sm {
  padding: 4px 8px;
}
.mt-4 {
  margin-top: 16px;
}
.text-xs {
  font-size: 12px;
}
.block {
  display: block;
}
</style>
