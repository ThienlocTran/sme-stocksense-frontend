<script setup>
import { computed, onMounted, ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()
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
  { key: 'productCode', label: t('inventoryCountDetail.productCode'), class: 'cell-compact' },
  { key: 'productName', label: t('inventoryCountDetail.productName') },
  { key: 'systemQuantity', label: t('inventoryCountDetail.systemQuantity'), class: 'cell-right tabular-num' },
  { key: 'actualQuantity', label: t('inventoryCountDetail.actualQuantity'), class: 'cell-nowrap' },
  { key: 'differenceQuantity', label: t('inventoryCountDetail.differenceQuantity'), class: 'cell-right tabular-num' },
  { key: 'note', label: t('inventoryCountDetail.note') },
  { key: 'actions', label: t('inventoryCountDetail.save'), class: 'cell-compact text-center' }
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
    errorMessage.value = error.message || t('inventoryCountDetail.errorLoadDetail')
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
        showToast(t('inventoryCountDetail.errorInvalidActual', { productCode: d.productCode }), 'error')
        return
      }
      const actualQty = Number(localActual)
      if (isNaN(actualQty) || actualQty < 0) {
        showToast(t('inventoryCountDetail.errorInvalidQty', { productCode: d.productCode }), 'error')
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
    showToast(t('inventoryCountDetail.noChanges'), 'info')
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
    showToast(t('inventoryCountDetail.saveAllSuccess', { count: successCount }), 'success')
  } else if (successCount > 0) {
    showToast(t('inventoryCountDetail.savePartial', { success: successCount, fail: failCount, error: lastErrorMessage }), 'error')
  } else {
    showToast(t('inventoryCountDetail.saveFailed', { error: lastErrorMessage }), 'error')
  }
}

async function saveLine(detail) {
  const actualVal = localActuals.value[detail.id]
  if (actualVal === '' || actualVal === null || actualVal === undefined) {
    showToast(t('inventoryCountDetail.invalidActualQty'), 'error')
    return
  }
  const actualQty = Number(actualVal)
  if (isNaN(actualQty) || actualQty < 0) {
    showToast(t('inventoryCountDetail.actualQtyMustBePositive'), 'error')
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
    showToast(t('inventoryCountDetail.updateLineSuccess'), 'success')
  } catch (error) {
    showToast(error.message || t('inventoryCountDetail.updateLineFailed'), 'error')
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
    showToast(t('inventoryCountDetail.errorUncounted'), 'error')
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
    showToast(t('inventoryCountDetail.finalizeSuccess'), 'success')
  } catch (error) {
    showToast(error.message || t('inventoryCountDetail.finalizeFailed'), 'error')
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
    cancelErrorMessage.value = t('inventoryCountDetail.errorCancelReason')
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
    showToast(t('inventoryCountDetail.cancelSuccess'), 'success')
  } catch (error) {
    cancelErrorMessage.value = error.message || t('inventoryCountDetail.cancelFailed')
  } finally {
    isCancelLoading.value = false
  }
}

function getStatusText(status) {
  if (status === 'DANG_KIEM_KE') return t('inventoryCountDetail.counting')
  if (status === 'DA_CHOT') return t('inventoryCountDetail.finalized')
  if (status === 'DA_HUY') return t('inventoryCountDetail.cancelled')
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
    <PageHeader :title="count ? t('inventoryCountDetail.titleWithCode', { code: count.code }) : t('inventoryCountDetail.title')" :description="t('inventoryCountDetail.description')">
      <div class="actions-header-group">
        <button class="btn btn-outline" @click="router.push('/inventory-counts')">
          <i class="mdi mdi-arrow-left"></i> {{ t("inventoryCountDetail.back") }} </button>
        
        <button
          v-if="isActive"
          class="btn btn-secondary"
          @click="saveAllLines"
          :disabled="savingAll"
        >
          <i class="mdi" :class="savingAll ? 'mdi-loading mdi-spin' : 'mdi-content-save-all'"></i> {{ t("inventoryCountDetail.saveChanges") }} </button>

        <template v-if="isActive && canManage">
          <button class="btn btn-danger" @click="openCancel">
            <i class="mdi mdi-close-circle-outline"></i> {{ t("inventoryCountDetail.cancelCount") }} </button>
          <button class="btn btn-primary" @click="openFinalize">
            <i class="mdi mdi-check-all"></i> {{ t("inventoryCountDetail.finalizeCount") }} </button>
        </template>
      </div>
    </PageHeader>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state card card-pad">
      <i class="mdi mdi-loading mdi-spin text-2xl text-blue-600"></i>
      <span>{{ t("inventoryCountDetail.loadingInfo") }}</span>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="error-alert card card-pad">
      <div class="flex items-center gap-3">
        <i class="mdi mdi-alert-circle text-2xl"></i>
        <span>{{ errorMessage }}</span>
        <button class="btn btn-secondary btn-sm ml-auto" @click="fetchDetail">{{ t("inventoryCountDetail.retry") }}</button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="count" class="detail-workspace animate-in fade-in duration-200">
      <!-- Session Summary Metrics -->
      <div class="summary-metrics-grid">
        <div class="metric-card card card-pad">
          <span class="metric-label">{{ t("inventoryCountDetail.totalLines") }}</span>
          <span class="metric-value text-zinc-900">{{ totalLines }}</span>
        </div>
        <div class="metric-card card card-pad bg-emerald-50/50">
          <span class="metric-label">{{ t("inventoryCountDetail.matchingLines") }}</span>
          <span class="metric-value text-emerald-600">{{ matchingLines }}</span>
        </div>
        <div class="metric-card card card-pad bg-amber-50/50">
          <span class="metric-label">{{ t("inventoryCountDetail.overageLines") }}</span>
          <span class="metric-value text-amber-600">{{ overageLines }}</span>
        </div>
        <div class="metric-card card card-pad bg-rose-50/50">
          <span class="metric-label">{{ t("inventoryCountDetail.shortageLines") }}</span>
          <span class="metric-value text-rose-600">{{ shortageLines }}</span>
        </div>
        <div class="metric-card card card-pad bg-zinc-50/50" v-if="isActive">
          <span class="metric-label">{{ t("inventoryCountDetail.uncountedLines") }}</span>
          <span class="metric-value text-zinc-500">{{ uncountedLines }}</span>
        </div>
      </div>

      <!-- Session Metadata Card -->
      <div class="card card-pad mb-6">
        <h3 class="section-title mb-4">{{ t("inventoryCountDetail.countInfo") }}</h3>
        <div class="meta-layout">
          <div class="meta-item">
            <span class="meta-label">{{ t("inventoryCountDetail.warehouse") }}</span>
            <span class="meta-value">{{ count.warehouseName }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">{{ t("inventoryCountDetail.status") }}</span>
            <span class="meta-value"><StatusBadge :status="getStatusText(count.status)" /></span>
          </div>
          <div class="meta-item">
            <span class="meta-label">{{ t("inventoryCountDetail.createdBy") }}</span>
            <span class="meta-value">{{ count.createdByName }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">{{ t("inventoryCountDetail.createdAt") }}</span>
            <span class="meta-value text-zinc-700">{{ formatDate(count.createdAt) }}</span>
          </div>

          <!-- Conditionally display finalize details -->
          <div class="meta-item" v-if="count.status === 'DA_CHOT'">
            <span class="meta-label">{{ t("inventoryCountDetail.finalizedAt") }}</span>
            <span class="meta-value text-emerald-600 font-semibold">{{ formatDate(count.finalizedAt) }}</span>
          </div>

          <!-- Conditionally display cancel details -->
          <div class="meta-item col-span-2" v-if="count.status === 'DA_HUY'">
            <span class="meta-label text-rose-600">{{ t("inventoryCountDetail.cancelReasonLabel", { date: formatDate(count.cancelledAt) }) }}</span>
            <span class="meta-value text-rose-600 font-medium">{{ count.cancellationReason || t('inventoryCountDetail.noSpecificReason') }}</span>
          </div>

          <div class="meta-item col-span-2">
            <span class="meta-label">{{ t("inventoryCountDetail.generalNote") }}</span>
            <span class="meta-value">{{ count.note || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Detail Lines Workspace -->
      <div class="card">
        <div class="card-header border-b px-6 py-4 flex items-center justify-between bg-zinc-50/50">
          <h3 class="section-title mb-0">{{ t("inventoryCountDetail.productList") }}</h3>
          <span class="text-sm text-zinc-500 font-medium">{{ t("inventoryCountDetail.totalItems", { count: totalLines }) }}</span>
        </div>

        <!-- Desktop Table View -->
        <div class="inventory-desktop-table">
          <DataTable :columns="columns" :rows="count.details">
            <template #actions-header>
              <span class="text-center block">{{ t("inventoryCountDetail.actions") }}</span>
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
                  :placeholder="t('inventoryCountDetail.placeholderActual')"
                  :aria-label="t('inventoryCountDetail.ariaActual')"
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
                :placeholder="t('inventoryCountDetail.placeholderNote')"
                :aria-label="t('inventoryCountDetail.ariaNote')"
              />
              <span v-else class="text-zinc-600">{{ row.note || '—' }}</span>
            </template>
            <template #actions="{ row }">
              <div class="text-center" v-if="isActive">
                <button
                  class="btn btn-ghost btn-icon btn-sm"
                  @click="saveLine(row)"
                  :disabled="savingDetailId === row.id"
                  :title="t('inventoryCountDetail.saveLine')"
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
                <span class="text-xs text-muted block mb-1">{{ t("inventoryCountDetail.differenceQuantity") }}</span>
                <span :class="getDiffClass(localDifference(row.id, row.systemQuantity))">
                  {{ getDiffText(localDifference(row.id, row.systemQuantity)) }}
                </span>
              </div>
            </div>

            <div class="item-qty-row">
              <div class="qty-box">
                <span class="qty-label">{{ t("inventoryCountDetail.systemQuantity") }}</span>
                <span class="qty-val">{{ row.systemQuantity }}</span>
              </div>
              <div class="qty-box-input" v-if="isActive">
                <span class="qty-label required">{{ t("inventoryCountDetail.actualQuantity") }}</span>
                <input
                  type="number"
                  min="0"
                  class="input actual-input-mobile"
                  v-model.number="localActuals[row.id]"
                  :placeholder="t('inventoryCountDetail.placeholderActualMobile')"
                />
              </div>
              <div class="qty-box" v-else>
                <span class="qty-label">{{ t("inventoryCountDetail.actualQuantity") }}</span>
                <span class="qty-val">{{ row.actualQuantity !== null ? row.actualQuantity : '—' }}</span>
              </div>
            </div>

            <!-- Notes Field -->
            <div class="item-notes-field mt-3">
              <span class="qty-label">{{ t("inventoryCountDetail.note") }}</span>
              <input
                v-if="isActive"
                type="text"
                class="input note-input-mobile"
                v-model="localNotes[row.id]"
                :placeholder="t('inventoryCountDetail.placeholderNoteMobile')"
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
                <i class="mdi" :class="savingDetailId === row.id ? 'mdi-loading mdi-spin' : 'mdi-content-save'"></i> {{ t("inventoryCountDetail.saveLine") }} </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Finalize Confirm Dialog -->
    <ConfirmDialog
      :open="isFinalizeOpen"
      :title="t('inventoryCountDetail.finalizeTitle')"
      :message="t('inventoryCountDetail.finalizeMessage')"
      :confirmText="t('inventoryCountDetail.finalizeConfirm')"
      :loading="isFinalizeLoading"
      @cancel="isFinalizeOpen = false"
      @confirm="handleFinalize"
    />

    <!-- Cancel Confirm Dialog -->
    <ConfirmDialog
      :open="isCancelOpen"
      :title="t('inventoryCountDetail.cancelTitle')"
      :message="t('inventoryCountDetail.cancelMessage')"
      :confirmText="t('inventoryCountDetail.cancelConfirm')"
      danger
      :loading="isCancelLoading"
      @cancel="isCancelOpen = false"
      @confirm="handleCancel"
    >
      <div class="field mt-4">
        <label class="required">{{ t("inventoryCountDetail.cancelReasonInputLabel") }}</label>
        <textarea class="textarea" v-model="cancelReason" :placeholder="t('inventoryCountDetail.cancelReasonPlaceholder')"></textarea>
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
