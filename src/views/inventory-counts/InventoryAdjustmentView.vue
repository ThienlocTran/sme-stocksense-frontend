<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '../../components/PageHeader.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import { useAuthStore } from '../../stores/auth'
import { getInventoryCountById, finalizeInventoryCount } from '../../services/inventoryCountService'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const countId = Number(route.params.id)

const authStore = useAuthStore()
const currentUser = computed(() => authStore.currentUser)
const currentRole = computed(() => authStore.currentRole)

// Roles
const isAdminOrManager = computed(() => ['ADMIN', 'MANAGER'].includes(currentRole.value))
const isEmployee = computed(() => currentRole.value === 'EMPLOYEE')
const canSubmit = computed(() => ['ADMIN', 'EMPLOYEE'].includes(currentRole.value))

// States
const count = ref(null)
const adjustment = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')
const isActionLoading = ref(false)

const isRejectDialogOpen = ref(false)
const rejectReason = ref('')

const isApplyDialogOpen = ref(false)

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

onMounted(loadVoucher)

// Local Storage Helper
const STORAGE_KEY = 'stocksense-adjustments'

function getSavedAdjustments() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch (e) {
    console.error('Failed to parse adjustments from localStorage:', e)
    return {}
  }
}

function saveAdjustment(adj) {
  try {
    const adjs = getSavedAdjustments()
    adjs[countId] = adj
    localStorage.setItem(STORAGE_KEY, JSON.stringify(adjs))
  } catch (e) {
    console.error('Failed to save adjustment to localStorage:', e)
  }
}

async function loadVoucher() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    if (isNaN(countId) || countId <= 0) {
      throw new Error(t('inventoryCountDetail.errorLoadDetail'))
    }
    const countData = await getInventoryCountById(countId)
    count.value = countData

    const adjs = getSavedAdjustments()
    let localAdj = adjs[countId]

    // If backend is already finalized, the adjustment is considered APPLIED
    if (countData.status === 'DA_CHOT') {
      if (!localAdj) {
        localAdj = initializeLocalAdjustment(countData)
      }
      localAdj.status = 'DA_AP_DUNG'
      saveAdjustment(localAdj)
    }

    if (!localAdj) {
      // Auto initialize
      localAdj = initializeLocalAdjustment(countData)
      saveAdjustment(localAdj)
    } else if (localAdj.status === 'NHAP') {
      // Sync draft details with latest count data from database
      const freshAdj = initializeLocalAdjustment(countData)
      freshAdj.details.forEach(freshDetail => {
        const oldDetail = localAdj.details?.find(d => d.id === freshDetail.id)
        if (oldDetail) {
          freshDetail.note = oldDetail.note
        }
      })
      localAdj.details = freshAdj.details
      localAdj.code = freshAdj.code
      localAdj.countCode = freshAdj.countCode
      localAdj.warehouseName = freshAdj.warehouseName
      localAdj.warehouseId = freshAdj.warehouseId
      saveAdjustment(localAdj)
    }

    adjustment.value = localAdj
  } catch (error) {
    errorMessage.value = error.message || t('inventoryCountDetail.errorLoadDetail')
  } finally {
    isLoading.value = false
  }
}

function initializeLocalAdjustment(countData) {
  const details = (countData.details || [])
    .filter(d => d.actualQuantity !== d.systemQuantity)
    .map(d => ({
      id: d.id,
      productId: d.productId,
      productCode: d.productCode,
      productName: d.productName,
      systemQuantity: d.systemQuantity,
      actualQuantity: d.actualQuantity,
      adjustmentQuantity: (d.actualQuantity !== null ? d.actualQuantity : 0) - d.systemQuantity,
      discrepancyReason: d.note || '',
      note: ''
    }))

  return {
    id: countId,
    code: `DC-${countData.code}`,
    countCode: countData.code,
    warehouseName: countData.warehouseName,
    warehouseId: countData.warehouseId,
    status: 'NHAP',
    createdById: currentUser.value?.employeeId || currentUser.value?.id,
    createdByName: currentUser.value?.hoTen || currentUser.value?.fullName || 'Employee',
    createdAt: new Date().toISOString(),
    details
  }
}

// Action Handlers
async function submitVoucher() {
  if (!adjustment.value) return
  isActionLoading.value = true
  try {
    adjustment.value.status = 'CHO_DUYET'
    saveAdjustment(adjustment.value)
    showToast(t('adjustment.msg.submitted') || 'Đã nộp phiếu điều chỉnh chờ duyệt.', 'success')
  } catch (error) {
    showToast(error.message, 'error')
  } finally {
    isActionLoading.value = false
  }
}

async function approveVoucher() {
  if (!adjustment.value) return
  isActionLoading.value = true
  try {
    adjustment.value.status = 'DA_DUYET'
    saveAdjustment(adjustment.value)
    showToast(t('adjustment.msg.approved') || 'Đã duyệt phiếu điều chỉnh tồn kho.', 'success')
  } catch (error) {
    showToast(error.message, 'error')
  } finally {
    isActionLoading.value = false
  }
}

function openRejectDialog() {
  rejectReason.value = ''
  isRejectDialogOpen.value = true
}

async function rejectVoucher() {
  if (!adjustment.value) return
  if (!rejectReason.value.trim()) {
    showToast(t('inventoryCountDetail.errorCancelReason'), 'error')
    return
  }
  isRejectDialogOpen.value = false
  isActionLoading.value = true
  try {
    adjustment.value.status = 'TU_CHOI'
    adjustment.value.rejectReason = rejectReason.value.trim()
    saveAdjustment(adjustment.value)
    showToast(t('adjustment.msg.rejected') || 'Đã từ chối phiếu điều chỉnh.', 'info')
  } catch (error) {
    showToast(error.message, 'error')
  } finally {
    isActionLoading.value = false
  }
}

function openApplyDialog() {
  isApplyDialogOpen.value = true
}

async function applyVoucher() {
  isApplyDialogOpen.value = false
  isActionLoading.value = true
  try {
    // Check if already finalized on backend
    if (count.value.status === 'DA_CHOT') {
      adjustment.value.status = 'DA_AP_DUNG'
      saveAdjustment(adjustment.value)
      showToast(t('adjustment.msg.alreadyApplied') || 'Phiếu điều chỉnh này đã được áp dụng trước đó.', 'info')
      return
    }

    // Call backend API to finalize count
    const updatedCount = await finalizeInventoryCount(countId, { version: count.value.version })
    count.value = updatedCount

    // Update local status to DA_AP_DUNG
    adjustment.value.status = 'DA_AP_DUNG'
    saveAdjustment(adjustment.value)
    showToast(t('adjustment.msg.appliedSuccess') || 'Đã áp dụng điều chỉnh và cập nhật tồn kho thực tế!', 'success')
  } catch (error) {
    if (error.message && error.message.includes('already finalized')) {
      adjustment.value.status = 'DA_AP_DUNG'
      saveAdjustment(adjustment.value)
      showToast(t('adjustment.msg.alreadyApplied') || 'Đợt kiểm kê đã chốt.', 'info')
    } else {
      showToast(error.message || t('inventoryCountDetail.finalizeFailed'), 'error')
    }
  } finally {
    isActionLoading.value = false
  }
}

function getStatusText(status) {
  if (status === 'NHAP') return t('adjustment.status.draft') || 'Nháp'
  if (status === 'CHO_DUYET') return t('adjustment.status.pending') || 'Chờ duyệt'
  if (status === 'DA_DUYET') return t('adjustment.status.approved') || 'Đã duyệt'
  if (status === 'TU_CHOI') return t('adjustment.status.rejected') || 'Từ chối'
  if (status === 'DA_AP_DUNG') return t('adjustment.status.applied') || 'Đã áp dụng'
  return status
}

function getDiffClass(diff) {
  if (diff > 0) return 'text-amber-600 font-semibold'
  if (diff < 0) return 'text-red-600 font-semibold'
  return 'text-zinc-500'
}

function getDiffText(diff) {
  if (diff > 0) return `+${diff}`
  return String(diff)
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString(locale.value === 'vi' ? 'vi-VN' : 'en-US')
}
</script>

<template>
  <div class="page-container page-shell">
    <PageHeader 
      :title="adjustment ? `${t('adjustment.title')} ${adjustment.code}` : t('adjustment.title')"
      :description="t('adjustment.description')"
    >
      <div class="actions-header-group">
        <button class="btn btn-outline" @click="router.push(isNaN(countId) || countId <= 0 ? '/inventory-counts' : `/inventory-counts/${countId}`)">
          <i class="mdi mdi-arrow-left"></i> {{ t('inventoryCountDetail.back') }}
        </button>

        <!-- Submission Actions -->
        <template v-if="adjustment && adjustment.status === 'NHAP' && canSubmit">
          <button 
            class="btn btn-primary" 
            @click="submitVoucher" 
            :disabled="isActionLoading"
          >
            <i class="mdi mdi-send"></i> {{ t('adjustment.actions.submit') || 'Nộp phiếu' }}
          </button>
        </template>

        <!-- Admin/Manager Actions -->
        <template v-if="adjustment && adjustment.status === 'CHO_DUYET' && isAdminOrManager">
          <button 
            class="btn btn-danger" 
            @click="openRejectDialog" 
            :disabled="isActionLoading"
          >
            <i class="mdi mdi-close-circle-outline"></i> {{ t('adjustment.actions.reject') || 'Từ chối' }}
          </button>
          <button 
            class="btn btn-primary" 
            @click="approveVoucher" 
            :disabled="isActionLoading"
          >
            <i class="mdi mdi-check-decagram-outline"></i> {{ t('adjustment.actions.approve') || 'Duyệt' }}
          </button>
        </template>

        <template v-if="adjustment && adjustment.status === 'DA_DUYET' && isAdminOrManager">
          <button 
            class="btn btn-success text-white" 
            @click="openApplyDialog" 
            :disabled="isActionLoading"
          >
            <i class="mdi mdi-check-all"></i> {{ t('adjustment.actions.apply') || 'Áp dụng' }}
          </button>
        </template>
      </div>
    </PageHeader>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state card card-pad">
      <i class="mdi mdi-loading mdi-spin text-2xl text-blue-600"></i>
      <span>{{ t('inventoryCountDetail.loadingInfo') }}</span>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="error-alert card card-pad">
      <div class="flex items-center gap-3">
        <i class="mdi mdi-alert-circle text-2xl"></i>
        <span>{{ errorMessage }}</span>
        <button class="btn btn-secondary btn-sm ml-auto" @click="loadVoucher">{{ t('inventoryCountDetail.retry') }}</button>
      </div>
    </div>

    <!-- Main Workspace -->
    <div v-else-if="adjustment" class="detail-workspace space-y-6 animate-in fade-in duration-200">
      
      <!-- Metadata Card -->
      <div class="card card-pad">
        <h3 class="section-title mb-4">{{ t('inventoryCountDetail.countInfo') }}</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('inventoryCountDetail.warehouse') }}</span>
            <span class="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{{ adjustment.warehouseName }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('inventoryCountDetail.status') }}</span>
            <span><StatusBadge :status="getStatusText(adjustment.status)" /></span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('inventoryCounts.createdBy') }}</span>
            <span class="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{{ adjustment.createdByName }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('inventoryCounts.createdAt') }}</span>
            <span class="text-sm text-zinc-700 dark:text-zinc-300 font-mono">{{ formatDate(adjustment.createdAt) }}</span>
          </div>
          
          <!-- Reject Reason -->
          <div class="col-span-1 md:col-span-2 flex flex-col gap-1" v-if="adjustment.status === 'TU_CHOI' && adjustment.rejectReason">
            <span class="text-xs font-semibold text-rose-500 uppercase tracking-wider">{{ t('adjustment.rejectReason') || 'Lý do từ chối' }}</span>
            <span class="text-sm font-semibold text-rose-600 dark:text-rose-400">{{ adjustment.rejectReason }}</span>
          </div>
        </div>
      </div>

      <!-- Details List Card -->
      <div class="card">
        <div class="card-header border-b px-6 py-4 bg-zinc-50/50 dark:bg-zinc-800/50 flex items-center justify-between">
          <h3 class="section-title mb-0">{{ t('inventoryCountDetail.productList') }}</h3>
          <span class="text-sm text-zinc-500 font-medium">{{ t('inventoryCountDetail.totalItems', { count: adjustment.details.length }) }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="table min-w-full">
            <thead>
              <tr class="border-b bg-zinc-50/20 dark:bg-zinc-800/10">
                <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('inventoryCountDetail.productCode') }}</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('inventoryCountDetail.productName') }}</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('inventoryCountDetail.systemQuantity') }}</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('inventoryCountDetail.actualQuantity') }}</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('adjustment.columns.adjustmentQty') || 'Lượng điều chỉnh' }}</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('adjustment.columns.discrepancyReason') || 'Lý do chênh lệch' }}</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('inventoryCountDetail.note') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr v-for="d in adjustment.details" :key="d.id" class="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10">
                <td class="px-4 py-3 text-sm font-mono font-semibold text-zinc-800 dark:text-zinc-200">{{ d.productCode }}</td>
                <td class="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">{{ d.productName }}</td>
                <td class="px-4 py-3 text-sm text-right font-mono text-zinc-600 dark:text-zinc-400">{{ d.systemQuantity }}</td>
                <td class="px-4 py-3 text-sm text-right font-mono text-zinc-800 dark:text-zinc-200">{{ d.actualQuantity }}</td>
                <td class="px-4 py-3 text-sm text-right font-mono" :class="getDiffClass(d.adjustmentQuantity)">
                  {{ getDiffText(d.adjustmentQuantity) }}
                </td>
                <td class="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {{ d.discrepancyReason }}
                </td>
                <td class="px-4 py-3 text-sm">
                  <input 
                    v-if="adjustment.status === 'NHAP' && canSubmit"
                    type="text" 
                    class="input note-input" 
                    v-model="d.note" 
                    :placeholder="t('inventoryCountDetail.placeholderNote')"
                    style="height: 32px; font-size: 13px;"
                  />
                  <span v-else class="text-zinc-600 dark:text-zinc-400">{{ d.note || '—' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Confirm Reject Dialog -->
    <ConfirmDialog
      :open="isRejectDialogOpen"
      :title="t('adjustment.actions.reject') || 'Từ chối phiếu'"
      message="Nhập lý do từ chối phiếu điều chỉnh tồn kho này:"
      confirmText="Từ chối"
      danger
      @cancel="isRejectDialogOpen = false"
      @confirm="rejectVoucher"
    >
      <div class="field mt-4">
        <textarea 
          class="textarea" 
          v-model="rejectReason" 
          placeholder="Nhập lý do từ chối..."
          required
        ></textarea>
      </div>
    </ConfirmDialog>

    <!-- Confirm Apply Dialog -->
    <ConfirmDialog
      :open="isApplyDialogOpen"
      :title="t('adjustment.confirmApplyTitle') || 'Xác nhận áp dụng điều chỉnh'"
      :message="t('adjustment.confirmApplyMessage') || 'Thao tác này sẽ cập nhật tồn kho thực tế. Bạn có chắc chắn muốn thực hiện?'"
      :confirmText="t('adjustment.actions.apply') || 'Áp dụng'"
      @cancel="isApplyDialogOpen = false"
      @confirm="applyVoucher"
    />

    <!-- Toast Notification -->
    <v-snackbar
      v-model="toast.show"
      :color="toast.color === 'error' ? 'red-darken-2' : toast.color === 'info' ? 'blue-darken-2' : 'teal-darken-3'"
      timeout="3000"
      rounded="lg"
      elevation="4"
    >
      <div class="flex items-center gap-2">
        <i class="mdi" :class="toast.color === 'error' ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline'"></i>
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
}
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: var(--color-text-secondary);
}
.error-alert {
  background: var(--color-danger-soft);
  border: 1px solid rgba(220, 38, 38, 0.2);
  color: var(--color-danger);
  padding: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.note-input {
  width: 100%;
  min-width: 150px;
}
</style>
