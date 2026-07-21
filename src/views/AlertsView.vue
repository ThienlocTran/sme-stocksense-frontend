<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import EmptyState from '../components/EmptyState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { getLowStockInventory } from '../services/inventoryService'
import { getWarehouses } from '../services/warehouseService'

const router = useRouter()
const alerts = ref([])
const warehouses = ref([])
const isLoading = ref(false)
const isLoadingDropdowns = ref(false)
const errorMessage = ref('')
const searchDraft = ref('')
const page = ref(0)
const size = ref(20)
const totalPages = ref(0)
const totalElements = ref(0)
const filters = reactive({ warehouseId: '', warehouseStatus: '' })

const columns = [
  { key: 'productCode', label: 'Mã SP', class: 'cell-compact' },
  { key: 'productName', label: 'Tên sản phẩm', class: 'cell-long' },
  { key: 'warehouse', label: 'Kho', class: 'cell-medium' },
  { key: 'currentQuantity', label: 'Tồn hiện tại', class: 'cell-compact' },
  { key: 'minStock', label: 'Tồn tối thiểu', class: 'cell-compact' },
  { key: 'severity', label: 'Mức độ', class: 'cell-compact' },
  { key: 'status', label: 'Trạng thái', class: 'cell-nowrap' },
  { key: 'lastUpdatedAt', label: 'Cập nhật', class: 'cell-nowrap' },
]

const hasPreviousPage = computed(() => page.value > 0)
const hasNextPage = computed(() => page.value + 1 < totalPages.value)
const hasActiveFilters = computed(() => {
  return (
    searchDraft.value.trim() !== '' ||
    filters.warehouseId !== '' ||
    filters.warehouseStatus !== ''
  )
})

onMounted(async () => {
  await loadDropdowns()
  fetchAlerts()
})

async function loadDropdowns() {
  isLoadingDropdowns.value = true
  errorMessage.value = ''

  try {
    warehouses.value = await getWarehouses({ status: 'HOAT_DONG' })
  } catch (error) {
    warehouses.value = []
    errorMessage.value = error.message
    if (error.status === 401) router.replace('/login')
  } finally {
    isLoadingDropdowns.value = false
  }
}

async function fetchAlerts() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const data = await getLowStockInventory({
      page: page.value,
      size: size.value,
      keyword: searchDraft.value.trim(),
      warehouseId: filters.warehouseId,
      warehouseStatus: filters.warehouseStatus,
    })

    alerts.value = data.content || []
    totalPages.value = data.totalPages || 0
    totalElements.value = data.totalElements || 0
  } catch (error) {
    alerts.value = []
    errorMessage.value = error.message
    if (error.status === 401) router.replace('/login')
  } finally {
    isLoading.value = false
  }
}

function applySearch() {
  page.value = 0
  fetchAlerts()
}

function applyFilter() {
  page.value = 0
  fetchAlerts()
}

function clearFilters() {
  searchDraft.value = ''
  filters.warehouseId = ''
  filters.warehouseStatus = ''
  page.value = 0
  fetchAlerts()
}

function displayWarehouseName(row) {
  return row.warehouseCode ? `${row.warehouseCode} - ${row.warehouse}` : row.warehouse || '-'
}

function formatInventoryStatus(status) {
  if (status === 'LOW_STOCK') return 'Sắp hết'
  if (status === 'OUT_OF_STOCK') return 'Thiếu hàng'
  if (status === 'NORMAL') return 'Đủ hàng'
  if (status === 'OVER_STOCK') return 'Thừa hàng'
  return status || '-'
}

function computeSeverity(row) {
  const current = Number(row.currentQuantity ?? 0)
  const minStock = Number(row.minStock ?? 0)
  if (current === 0) {
    return 'Khẩn cấp'
  }
  if (current < minStock) {
    return 'Cao'
  }
  if (current === minStock) {
    return 'Trung bình'
  }
  return 'Thấp'
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('vi-VN', { hour12: false })
}

function previousPage() {
  if (!hasPreviousPage.value) return
  page.value -= 1
  fetchAlerts()
}

function nextPage() {
  if (!hasNextPage.value) return
  page.value += 1
  fetchAlerts()
}
</script>

<template>
  <PageHeader title="Cảnh báo tồn kho" description="Hiển thị các sản phẩm có tồn kho dưới ngưỡng tối thiểu." />

  <SearchFilterBar
    v-model="searchDraft"
    placeholder="Tìm theo mã sản phẩm, tên sản phẩm hoặc mã vạch"
    @keyup.enter="applySearch"
  >
    <select v-model="filters.warehouseId" class="select" :disabled="isLoadingDropdowns || isLoading" @change="applyFilter">
      <option value="">{{ isLoadingDropdowns ? 'Đang tải kho...' : 'Tất cả kho' }}</option>
      <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
        {{ `${warehouse.maKho || warehouse.code || ''}${warehouse.tenKho || warehouse.name ? ' - ' : ''}${warehouse.tenKho || warehouse.name || ''}` }}
      </option>
    </select>

    <select v-model="filters.warehouseStatus" class="select" :disabled="isLoading" @change="applyFilter">
      <option value="">Tất cả trạng thái kho</option>
      <option value="HOAT_DONG">Đang hoạt động</option>
      <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
    </select>

    <div class="filter-actions">
      <button class="btn btn-primary" type="button" :disabled="isLoading" @click="applySearch">
        <i class="mdi mdi-magnify"></i>
        Tìm kiếm
      </button>
      <button v-if="hasActiveFilters" class="btn btn-ghost" type="button" :disabled="isLoading" @click="clearFilters">
        <i class="mdi mdi-filter-remove-outline"></i>
        Xóa lọc
      </button>
    </div>
  </SearchFilterBar>

  <p v-if="errorMessage" class="form-alert form-alert-error">{{ errorMessage }}</p>

  <div v-if="isLoading" class="inventory-loading card card-pad">
    <i class="mdi mdi-loading mdi-spin"></i>
    <span>Đang tải dữ liệu cảnh báo tồn kho...</span>
  </div>

  <DataTable v-else-if="alerts.length > 0" :columns="columns" :rows="alerts" min-width="1200px">
    <template #warehouse="{ row }">{{ displayWarehouseName(row) }}</template>
    <template #severity="{ row }">{{ computeSeverity(row) }}</template>
    <template #status="{ row }"><StatusBadge :status="formatInventoryStatus(row.status)" /></template>
    <template #lastUpdatedAt="{ value }">{{ formatDate(value) }}</template>
  </DataTable>

  <EmptyState
    v-else-if="!isLoading && !errorMessage"
    title="Không có cảnh báo tồn kho"
    description="Không tìm thấy sản phẩm có tồn kho dưới ngưỡng."
    icon="mdi-check-circle-outline"
  />

  <div v-if="alerts.length > 0" class="pagination-bar card card-pad">
    <span class="muted">{{ totalElements }} bản ghi</span>
    <div class="pagination-actions">
      <button class="btn btn-sm" type="button" :disabled="!hasPreviousPage || isLoading" @click="previousPage">
        <i class="mdi mdi-chevron-left"></i>
        Trước
      </button>
      <span class="page-indicator">Trang {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span>
      <button class="btn btn-sm" type="button" :disabled="!hasNextPage || isLoading" @click="nextPage">
        Sau
        <i class="mdi mdi-chevron-right"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.filter-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-actions .btn {
  min-width: 108px;
}

.inventory-loading {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
