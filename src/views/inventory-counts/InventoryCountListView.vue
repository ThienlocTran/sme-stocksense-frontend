<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '../../components/PageHeader.vue'
import DataTable from '../../components/DataTable.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import EmptyState from '../../components/EmptyState.vue'
import { getInventoryCounts, createInventoryCount } from '../../services/inventoryCountService'
import { getWarehouses } from '../../services/warehouseService'
import { canManageInventoryCounts } from '../../services/permissionService'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const { t } = useI18n()
const counts = ref([])
const warehouses = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const isCreateOpen = ref(false)
const errorMessage = ref('')
const saveErrorMessage = ref('')

const filters = reactive({
  warehouseId: '',
  status: ''
})

const page = ref(0)
const size = ref(20)
const totalPages = ref(0)
const totalElements = ref(0)

const countStatusOptions = [
  { value: '', label: t('inventoryCounts.allStatuses') },
  { value: 'DANG_KIEM_KE', label: t('inventoryCounts.counting') },
  { value: 'DA_CHOT', label: t('inventoryCounts.finalized') },
  { value: 'DA_HUY', label: t('inventoryCounts.cancelled') }
]

const authStore = useAuthStore()
const canManage = computed(() => canManageInventoryCounts(authStore.currentUser))

const columns = [
  { key: 'code', label: t('inventoryCounts.countCode'), class: 'cell-compact font-semibold text-zinc-900' },
  { key: 'warehouseName', label: t('inventoryCounts.warehouse') },
  { key: 'status', label: t('inventoryCounts.status') },
  { key: 'createdByName', label: t('inventoryCounts.createdBy') },
  { key: 'createdAt', label: t('inventoryCounts.createdAt') },
  { key: 'finalizedAt', label: t('inventoryCounts.finalizedAt') },
  { key: 'actions', label: t('inventoryCounts.actions'), class: 'cell-nowrap text-right' }
]

const createForm = reactive({
  warehouseId: '',
  note: ''
})

onMounted(() => {
  fetchCounts()
  fetchWarehouses()
})

async function fetchCounts() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getInventoryCounts({
      warehouseId: filters.warehouseId,
      status: filters.status,
      page: page.value,
      size: size.value
    })
    counts.value = res.content || []
    totalPages.value = res.totalPages || 0
    totalElements.value = res.totalElements || 0
  } catch (error) {
    counts.value = []
    errorMessage.value = error.message || t('inventoryCounts.errorLoadList')
  } finally {
    isLoading.value = false
  }
}

async function fetchWarehouses() {
  try {
    const data = await getWarehouses({ status: 'HOAT_DONG' })
    warehouses.value = data || []
  } catch (error) {
    console.error('Không thể tải danh sách kho:', error)
  }
}

function onFilterChange() {
  page.value = 0
  fetchCounts()
}

const hasPreviousPage = computed(() => page.value > 0)
const hasNextPage = computed(() => page.value + 1 < totalPages.value)

function previousPage() {
  if (!hasPreviousPage.value) return
  page.value -= 1
  fetchCounts()
}

function nextPage() {
  if (!hasNextPage.value) return
  page.value += 1
  fetchCounts()
}

function openCreateModal() {
  createForm.warehouseId = ''
  createForm.note = ''
  saveErrorMessage.value = ''
  isCreateOpen.value = true
}

function closeCreateModal() {
  isCreateOpen.value = false
}

async function handleCreate() {
  if (!createForm.warehouseId) {
    saveErrorMessage.value = t('inventoryCounts.errorSelectWarehouse')
    return
  }
  isSaving.value = true
  saveErrorMessage.value = ''
  try {
    const payload = {
      warehouseId: Number(createForm.warehouseId),
      note: createForm.note.trim() || null,
      productIds: [] // Mặc định kiểm kê tất cả sản phẩm
    }
    const newCount = await createInventoryCount(payload)
    isCreateOpen.value = false
    router.push(`/inventory-counts/${newCount.id}`)
  } catch (error) {
    saveErrorMessage.value = error.message || t('inventoryCounts.errorCreateCount')
  } finally {
    isSaving.value = false
  }
}

function viewDetail(id) {
  router.push(`/inventory-counts/${id}`)
}

function getStatusText(status) {
  if (status === 'DANG_KIEM_KE') return t('inventoryCounts.counting')
  if (status === 'DA_CHOT') return t('inventoryCounts.finalized')
  if (status === 'DA_HUY') return t('inventoryCounts.cancelled')
  return status
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
    <PageHeader :title="t('inventoryCounts.title')" :description="t('inventoryCounts.description')">
      <button v-if="canManage" class="btn btn-primary" @click="openCreateModal">
        <i class="mdi mdi-plus"></i> {{ t("inventoryCounts.createCount") }}
      </button>
    </PageHeader>

    <!-- Filter Row -->
    <div class="filter-bar card card-pad animate-in fade-in duration-200">
      <div class="filter-row">
        <div class="form-group flex-1">
          <label class="label">{{ t("inventoryCounts.warehouse") }}</label>
          <select class="select" v-model="filters.warehouseId" @change="onFilterChange">
            <option value="">{{ t("inventoryCounts.allWarehouses") }}</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">
              {{ w.maKho || w.code ? `${w.maKho || w.code} - ` : '' }}{{ w.name || w.tenKho }}
            </option>
          </select>
        </div>

        <div class="form-group flex-1">
          <label class="label">{{ t("inventoryCounts.status") }}</label>
          <select class="select" v-model="filters.status" @change="onFilterChange">
            <option v-for="opt in countStatusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="errorMessage" class="error-alert card card-pad">
      <div class="flex items-center gap-3 w-full">
        <i class="mdi mdi-alert-circle text-2xl"></i>
        <span>{{ errorMessage }}</span>
        <button class="btn btn-secondary btn-sm ml-auto" @click="fetchCounts">{{ t("inventoryCounts.retry") }}</button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading" class="loading-state card card-pad">
      <i class="mdi mdi-loading mdi-spin text-2xl text-blue-600"></i>
      <span>{{ t("inventoryCounts.loading") }}</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="counts.length === 0">
      <EmptyState
        :title="t('inventoryCounts.noCountsTitle')"
        :description="t('inventoryCounts.noCountsDesc')"
        icon="mdi-clipboard-text-search-outline"
      />
    </div>

    <!-- Data Table -->
    <div v-else class="table-container">
      <div class="inventory-desktop-table animate-in fade-in duration-200">
        <DataTable :columns="columns" :rows="counts" clickable @row-click="(row) => viewDetail(row.id)">
          <template #code="{ row }">
            <span class="font-semibold text-blue-600 cursor-pointer hover:underline" @click.stop="viewDetail(row.id)">
              {{ row.code }}
            </span>
          </template>
          <template #status="{ row }">
            <StatusBadge :status="getStatusText(row.status)" />
          </template>
          <template #createdAt="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
          <template #finalizedAt="{ row }">
            {{ formatDate(row.finalizedAt || row.cancelledAt) }}
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end gap-2">
              <button
                v-if="row.status === 'DANG_KIEM_KE' && canManage"
                class="btn btn-primary btn-sm flex items-center gap-1"
                @click.stop="viewDetail(row.id)"
              >
                <i class="mdi mdi-play-circle-outline"></i> {{ t("inventoryCounts.continueCount") }} </button>
              <button
                v-else-if="row.status === 'DA_CHOT'"
                class="btn btn-secondary btn-sm flex items-center gap-1"
                @click.stop="viewDetail(row.id)"
              >
                <i class="mdi mdi-file-check-outline"></i> {{ t("inventoryCounts.viewResult") }} </button>
              <button
                v-else
                class="btn btn-ghost btn-sm text-zinc-600 hover:bg-zinc-100 flex items-center gap-1"
                @click.stop="viewDetail(row.id)"
              >
                <i class="mdi mdi-eye-outline"></i> {{ t("inventoryCounts.viewDetail") }} </button>
            </div>
          </template>
        </DataTable>
      </div>

      <!-- Mobile List View -->
      <div class="inventory-mobile-list animate-in fade-in duration-200">
        <div v-for="row in counts" :key="row.id" class="mobile-count-card card card-pad" @click="viewDetail(row.id)">
          <div class="card-header-row">
            <span class="count-code">{{ row.code }}</span>
            <StatusBadge :status="getStatusText(row.status)" />
          </div>

          <div class="card-body-details">
            <div class="detail-row">
              <span class="detail-label">{{ t("inventoryCounts.warehouse") }}</span>
              <span class="detail-val">{{ row.warehouseName }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ t("inventoryCounts.createdBy") }}</span>
              <span class="detail-val">{{ row.createdByName }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ t("inventoryCounts.createdAt") }}</span>
              <span class="detail-val text-muted">{{ formatDate(row.createdAt) }}</span>
            </div>
            <div class="detail-row" v-if="row.finalizedAt || row.cancelledAt">
              <span class="detail-label">{{ row.status === 'DA_CHOT' ? t('inventoryCounts.finalizedDate') : t('inventoryCounts.cancelledDate') }}</span>
              <span class="detail-val text-muted">{{ formatDate(row.finalizedAt || row.cancelledAt) }}</span>
            </div>
          </div>

          <div class="card-footer-action">
            <button
              v-if="row.status === 'DANG_KIEM_KE' && canManage"
              class="btn btn-primary btn-sm w-full justify-center gap-1"
            >
              <i class="mdi mdi-play-circle-outline"></i> {{ t("inventoryCounts.continueCount") }} </button>
            <button
              v-else-if="row.status === 'DA_CHOT'"
              class="btn btn-secondary btn-sm w-full justify-center gap-1"
            >
              <i class="mdi mdi-file-check-outline"></i> {{ t("inventoryCounts.viewResult") }} </button>
            <button
              v-else
              class="btn btn-ghost btn-sm w-full justify-center gap-1"
            >
              <i class="mdi mdi-eye-outline"></i> {{ t("inventoryCounts.viewDetail") }} </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination-bar card card-pad">
        <span class="muted">{{ totalElements }} {{ t("inventoryCounts.records") }}</span>
        <div class="pagination-actions">
          <button
            class="btn btn-sm"
            type="button"
            :disabled="!hasPreviousPage || isLoading"
            @click="previousPage"
          >
            <i class="mdi mdi-chevron-left"></i> {{ t("inventoryCounts.previous") }} </button>
          <span class="page-indicator">{{ t("inventoryCounts.page") }} {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span>
          <button
            class="btn btn-sm"
            type="button"
            :disabled="!hasNextPage || isLoading"
            @click="nextPage"
          > {{ t("inventoryCounts.next") }} <i class="mdi mdi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Create Modal Dialog -->
    <div v-if="isCreateOpen" class="modal-backdrop" @click.self="closeCreateModal">
      <div class="modal">
        <div class="modal-head between">
          <div>
            <h2 class="section-title">{{ t("inventoryCounts.modalCreateTitle") }}</h2>
            <p class="modal-subtitle">{{ t("inventoryCounts.modalCreateDesc") }}</p>
          </div>
          <button class="btn btn-icon" @click="closeCreateModal" :aria-label="t('inventoryCounts.close')">
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="modal-body">
          <div v-if="saveErrorMessage" class="error-alert">
            <i class="mdi mdi-alert-circle text-lg"></i>
            <span>{{ saveErrorMessage }}</span>
          </div>

          <div class="field">
            <label class="required">{{ t("inventoryCounts.selectWarehouseLabel") }}</label>
            <select class="select" v-model="createForm.warehouseId">
              <option value="" disabled>{{ t("inventoryCounts.selectWarehousePlaceholder") }}</option>
              <option v-for="w in warehouses" :key="w.id" :value="w.id">
                {{ w.maKho || w.code ? `${w.maKho || w.code} - ` : '' }}{{ w.name || w.tenKho }}
              </option>
            </select>
            <span class="helper-text">{{ t("inventoryCounts.warehouseHelperText") }}</span>
          </div>

          <div class="field">
            <label>{{ t("inventoryCounts.note") }}</label>
            <textarea class="textarea" v-model="createForm.note" :placeholder="t('inventoryCounts.notePlaceholder')"></textarea>
          </div>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeCreateModal" :disabled="isSaving">{{ t("inventoryCounts.cancel") }}</button>
          <button class="btn btn-primary" @click="handleCreate" :disabled="isSaving">
            <i v-if="isSaving" class="mdi mdi-loading mdi-spin"></i>
            {{ isSaving ? t('inventoryCounts.creating') : t('inventoryCounts.confirmCreate') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-row {
  display: flex;
  gap: 16px;
  width: 100%;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-weight: 600;
  color: var(--color-text-primary);
}

.flex-1 {
  flex: 1;
}

.helper-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.ml-auto {
  margin-left: auto;
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

.cursor-pointer {
  cursor: pointer;
}

.hover\:underline:hover {
  text-decoration: underline;
}

.text-right {
  text-align: right;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  gap: 16px;
}

.pagination-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-indicator {
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

/* Modal styles overrides if any */
.modal-subtitle {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

/* Mobile responsive styles */
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
    margin-bottom: 16px;
  }
  .mobile-count-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    cursor: pointer;
    transition: transform 150ms ease, border-color 150ms ease;
  }
  .mobile-count-card:hover {
    border-color: var(--color-border-strong);
  }
  .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 10px;
    margin-bottom: 10px;
  }
  .count-code {
    font-weight: 700;
    color: var(--color-action-primary);
  }
  .card-body-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }
  .detail-label {
    color: var(--color-text-secondary);
  }
  .detail-val {
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .card-footer-action {
    border-top: 1px solid var(--color-border);
    padding-top: 10px;
  }
  .filter-row {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
