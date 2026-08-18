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
  { key: 'systemQuantity', label: 'Tồn hệ thống', class: 'cell-right tabular-num' },
  { key: 'actualQuantity', label: 'Thực tế', class: 'cell-nowrap' },
  { key: 'differenceQuantity', label: 'Chênh lệch', class: 'cell-right tabular-num' },
  { key: 'note', label: 'Ghi chú' },
  { key: 'actions', label: 'Lưu', class: 'cell-compact text-center' }
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

// Helper to compute local difference on-the-fly
function localDifference(rowId, systemQty) {
  const val = localActuals.value[rowId]
  if (val === '' || val === null || val === undefined) return null
  return Number(val) - systemQty
}

// KPI counters calculated dynamically based on unsaved local edits
const totalLines = computed(() => count.value?.details?.length || 0)

const matchingLines = computed(() => {
  if (!count.value?.details) return 0
  return count.value.details.filter(d => {
    const diff = localDifference(d.id, d.systemQuantity)
    return diff !== null && diff === 0
  }).length
})

const overageLines = computed(() => {
  if (!count.value?.details) return 0
  return count.value.details.filter(d => {
    const diff = localDifference(d.id, d.systemQuantity)
    return diff !== null && diff > 0
  }).length
})

const shortageLines = computed(() => {
  if (!count.value?.details) return 0
  return count.value.details.filter(d => {
    const diff = localDifference(d.id, d.systemQuantity)
    return diff !== null && diff < 0
  }).length
})

const uncountedLines = computed(() => {
  if (!count.value?.details) return 0
  return count.value.details.filter(d => {
    const val = localActuals.value[d.id]
    return val === '' || val === null || val === undefined
  }).length
})

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
  // Check if all lines have actual quantities (both backend and local)
  const hasUncounted = count.value.details.some(d => {
    const val = localActuals.value[d.id]
    return val === '' || val === null || val === undefined
  })
  if (hasUncounted) {
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
  if (diff === null) return 'text-zinc-400'
  if (diff > 0) return 'text-amber-600 font-semibold'
  if (diff < 0) return 'text-red-600 font-semibold font-bold'
  return 'text-zinc-500 font-medium'
}

function getDiffText(diff) {
  if (diff === null) return '—'
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
  <div class="page-container page-shell">
    <PageHeader :title="count ? `Chi tiết kiểm kê: ${count.code}` : 'Chi tiết kiểm kê'" description="Theo dõi đối soát và cập nhật số lượng tồn kho thực tế.">
      <div class="actions-header-group">
        <button class="btn btn-outline" @click="router.push('/inventory-counts')">
          <i class="mdi mdi-arrow-left"></i> Quay lại
        </button>
        
        <button
          v-if="isActive"
          class="btn btn-secondary"
          @click="saveAllLines"
          :disabled="savingAll"
        >
          <i class="mdi" :class="savingAll ? 'mdi-loading mdi-spin' : 'mdi-content-save-all'"></i>
          Lưu thay đổi
        </button>

        <template v-if="isActive && canManage">
          <button class="btn btn-danger" @click="openCancel">
            <i class="mdi mdi-close-circle-outline"></i> Hủy
          </button>
          <button class="btn btn-primary" @click="openFinalize">
            <i class="mdi mdi-check-all"></i> Chốt kiểm kê
          </button>
        </template>
      </div>
    </PageHeader>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state card card-pad">
      <i class="mdi mdi-loading mdi-spin text-2xl text-blue-600"></i>
      <span>Đang tải thông tin đợt kiểm kê...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="error-alert card card-pad">
      <div class="flex items-center gap-3">
        <i class="mdi mdi-alert-circle text-2xl"></i>
        <span>{{ errorMessage }}</span>
        <button class="btn btn-secondary btn-sm ml-auto" @click="fetchDetail">Thử lại</button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="count" class="detail-workspace animate-in fade-in duration-200">
      <!-- Session Summary Metrics -->
      <div class="summary-metrics-grid">
        <div class="metric-card card card-pad">
          <span class="metric-label">Tổng dòng sản phẩm</span>
          <span class="metric-value text-zinc-900">{{ totalLines }}</span>
        </div>
        <div class="metric-card card card-pad bg-emerald-50/50">
          <span class="metric-label">Số dòng khớp</span>
          <span class="metric-value text-emerald-600">{{ matchingLines }}</span>
        </div>
        <div class="metric-card card card-pad bg-amber-50/50">
          <span class="metric-label">Số dòng thừa</span>
          <span class="metric-value text-amber-600">{{ overageLines }}</span>
        </div>
        <div class="metric-card card card-pad bg-rose-50/50">
          <span class="metric-label">Số dòng thiếu</span>
          <span class="metric-value text-rose-600">{{ shortageLines }}</span>
        </div>
        <div class="metric-card card card-pad bg-zinc-50/50" v-if="isActive">
          <span class="metric-label">Chưa kiểm kê</span>
          <span class="metric-value text-zinc-500">{{ uncountedLines }}</span>
        </div>
      </div>

      <!-- Session Metadata Card -->
      <div class="card card-pad mb-6">
        <h3 class="section-title mb-4">Thông tin đợt kiểm kê</h3>
        <div class="meta-layout">
          <div class="meta-item">
            <span class="meta-label">Kho hàng kiểm kê</span>
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
            <span class="meta-value text-zinc-700">{{ formatDate(count.createdAt) }}</span>
          </div>

          <!-- Conditionally display finalize details -->
          <div class="meta-item" v-if="count.status === 'DA_CHOT'">
            <span class="meta-label">Ngày hoàn tất</span>
            <span class="meta-value text-emerald-600 font-semibold">{{ formatDate(count.finalizedAt) }}</span>
          </div>

          <!-- Conditionally display cancel details -->
          <div class="meta-item col-span-2" v-if="count.status === 'DA_HUY'">
            <span class="meta-label text-rose-600">Lý do hủy (Ngày hủy: {{ formatDate(count.cancelledAt) }})</span>
            <span class="meta-value text-rose-600 font-medium">{{ count.cancellationReason || 'Không có lý do cụ thể' }}</span>
          </div>

          <div class="meta-item col-span-2">
            <span class="meta-label">Ghi chú chung</span>
            <span class="meta-value">{{ count.note || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Detail Lines Workspace -->
      <div class="card">
        <div class="card-header border-b px-6 py-4 flex items-center justify-between bg-zinc-50/50">
          <h3 class="section-title mb-0">Danh sách sản phẩm kiểm kê</h3>
          <span class="text-sm text-zinc-500 font-medium">Tổng số: {{ totalLines }} mặt hàng</span>
        </div>

        <!-- Desktop Table View -->
        <div class="inventory-desktop-table">
          <DataTable :columns="columns" :rows="count.details">
            <template #actions-header>
              <span class="text-center block">Thao tác</span>
            </template>
            <template #productCode="{ row }">
              <span class="font-mono text-zinc-800 font-semibold">{{ row.productCode }}</span>
            </template>
            <template #systemQuantity="{ row }">
              <span class="font-semibold text-zinc-700">{{ row.systemQuantity }}</span>
            </template>
            <template #actualQuantity="{ row }">
              <div class="flex items-center gap-2" v-if="isActive">
                <input
                  type="number"
                  min="0"
                  class="input actual-input"
                  v-model.number="localActuals[row.id]"
                  placeholder="Nhập thực tế"
                  aria-label="Số lượng thực tế"
                />
              </div>
              <span v-else class="font-semibold text-zinc-800">{{ row.actualQuantity !== null ? row.actualQuantity : '—' }}</span>
            </template>
            <template #differenceQuantity="{ row }">
              <span :class="getDiffClass(localDifference(row.id, row.systemQuantity))">
                {{ getDiffText(localDifference(row.id, row.systemQuantity)) }}
              </span>
            </template>
            <template #note="{ row }">
              <input
                v-if="isActive"
                type="text"
                class="input note-input"
                v-model="localNotes[row.id]"
                placeholder="Ví dụ: Thiếu 2 hộp do hỏng..."
                aria-label="Ghi chú dòng sản phẩm"
              />
              <span v-else class="text-zinc-600">{{ row.note || '—' }}</span>
            </template>
            <template #actions="{ row }">
              <div class="text-center" v-if="isActive">
                <button
                  class="btn btn-ghost btn-icon btn-sm"
                  @click="saveLine(row)"
                  :disabled="savingDetailId === row.id"
                  title="Lưu dòng này"
                >
                  <i class="mdi" :class="savingDetailId === row.id ? 'mdi-loading mdi-spin text-blue-600' : 'mdi-content-save text-blue-600'"></i>
                </button>
              </div>
              <span v-else class="text-center block text-zinc-400">—</span>
            </template>
          </DataTable>
        </div>

        <!-- Mobile Layout Cards -->
        <div class="inventory-mobile-list">
          <div v-for="row in count.details" :key="row.id" class="mobile-count-item card card-pad">
            <div class="item-header-row">
              <div class="product-identity">
                <span class="product-name font-semibold text-zinc-900">{{ row.productName }}</span>
                <span class="product-sku text-xs font-mono text-muted bg-zinc-100 px-2 py-0.5 rounded">SKU: {{ row.productCode }}</span>
              </div>
              <div class="difference-col text-right">
                <span class="text-xs text-muted block mb-1">Chênh lệch</span>
                <span :class="getDiffClass(localDifference(row.id, row.systemQuantity))">
                  {{ getDiffText(localDifference(row.id, row.systemQuantity)) }}
                </span>
              </div>
            </div>

            <div class="item-qty-row">
              <div class="qty-box">
                <span class="qty-label">Tồn hệ thống</span>
                <span class="qty-val">{{ row.systemQuantity }}</span>
              </div>
              <div class="qty-box-input" v-if="isActive">
                <span class="qty-label required">Thực tế</span>
                <input
                  type="number"
                  min="0"
                  class="input actual-input-mobile"
                  v-model.number="localActuals[row.id]"
                  placeholder="Nhập số thực"
                />
              </div>
              <div class="qty-box" v-else>
                <span class="qty-label">Thực tế</span>
                <span class="qty-val">{{ row.actualQuantity !== null ? row.actualQuantity : '—' }}</span>
              </div>
            </div>

            <!-- Notes Field -->
            <div class="item-notes-field mt-3">
              <span class="qty-label">Ghi chú</span>
              <input
                v-if="isActive"
                type="text"
                class="input note-input-mobile"
                v-model="localNotes[row.id]"
                placeholder="Ghi chú riêng cho sản phẩm này..."
              />
              <span v-else class="text-zinc-700 block text-xs mt-1">{{ row.note || '—' }}</span>
            </div>

            <!-- Individual Save Trigger on Mobile -->
            <div class="item-save-action mt-3 border-t pt-3 flex justify-end" v-if="isActive">
              <button
                class="btn btn-secondary btn-sm flex items-center gap-1"
                @click="saveLine(row)"
                :disabled="savingDetailId === row.id"
              >
                <i class="mdi" :class="savingDetailId === row.id ? 'mdi-loading mdi-spin' : 'mdi-content-save'"></i>
                Lưu dòng này
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Finalize Confirm Dialog -->
    <ConfirmDialog
      :open="isFinalizeOpen"
      title="Chốt đợt kiểm kê"
      message="Khi hoàn tất chốt kiểm kê, tồn kho hệ thống của sản phẩm sẽ được cập nhật trực tiếp theo số lượng thực tế đã nhập. Biến động kho sẽ được ghi nhận vào lịch sử giao dịch. Thao tác này không thể hoàn tác. Bạn có chắc chắn muốn chốt không?"
      confirmText="Xác nhận chốt"
      :loading="isFinalizeLoading"
      @cancel="isFinalizeOpen = false"
      @confirm="handleFinalize"
    />

    <!-- Cancel Confirm Dialog -->
    <ConfirmDialog
      :open="isCancelOpen"
      title="Hủy đợt kiểm kê"
      message="Bạn có chắc chắn muốn hủy đợt kiểm kê này không? Mọi số lượng thực tế đã nhập sẽ bị loại bỏ và tồn kho hệ thống sẽ được giữ nguyên."
      confirmText="Xác nhận hủy"
      danger
      :loading="isCancelLoading"
      @cancel="isCancelOpen = false"
      @confirm="handleCancel"
    >
      <div class="field mt-4">
        <label class="required">Lý do hủy đợt kiểm kê</label>
        <textarea class="textarea" v-model="cancelReason" placeholder="Nhập lý do hủy chi tiết..."></textarea>
        <span v-if="cancelErrorMessage" class="text-danger text-xs mt-1 block">{{ cancelErrorMessage }}</span>
      </div>
    </ConfirmDialog>

    <!-- Toast Notification Success/Error -->
    <v-snackbar
      v-model="toast.show"
      :color="toast.color === 'error' ? 'red-darken-2' : toast.color === 'info' ? 'blue-darken-2' : 'teal-darken-3'"
      timeout="3000"
      rounded="lg"
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
.actions-header-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.error-alert {
  background: var(--color-danger-soft);
  border: 1px solid rgba(220, 38, 38, 0.2);
  color: var(--color-danger);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ml-auto {
  margin-left: auto;
}

/* KPI Summary Widgets */
.summary-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--color-border);
  transition: border-color 150ms ease;
}

.metric-card:hover {
  border-color: var(--color-border-strong);
}

.metric-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.metric-value {
  font-size: 26px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Meta list style */
.meta-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.col-span-2 {
  grid-column: span 2;
}

.meta-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

/* Form input elements */
.actual-input {
  width: 110px;
  height: 34px;
  padding: 6px 10px;
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.note-input {
  width: 100%;
  min-width: 180px;
  height: 34px;
  padding: 6px 10px;
  font-size: 13px;
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

.block {
  display: block;
}

.cell-right {
  text-align: right;
}

.tabular-num {
  font-variant-numeric: tabular-nums;
}

.font-mono {
  font-family: var(--font-mono, monospace);
}

/* Mobile counts cards styling */
.inventory-mobile-list {
  display: none;
}

@media (max-width: 1023px) {
  .inventory-desktop-table {
    display: none;
  }
  .inventory-mobile-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: var(--color-bg);
  }
  .mobile-count-item {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
  }
  .item-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .product-identity {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .product-name {
    font-size: 14px;
    color: var(--color-text-primary);
  }
  .item-qty-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .qty-box {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--color-bg);
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
  }
  .qty-box-input {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .qty-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-secondary);
  }
  .qty-val {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text-primary);
  }
  .actual-input-mobile {
    height: 38px;
    font-weight: 700;
    text-align: right;
  }
  .note-input-mobile {
    height: 36px;
    font-size: 13px;
    margin-top: 4px;
  }
  .meta-layout {
    grid-template-columns: 1fr;
  }
  .col-span-2 {
    grid-column: span 1;
  }
}
</style>
