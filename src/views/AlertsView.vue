<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import EmptyState from '../components/EmptyState.vue'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import { getWarehouses } from '../services/warehouseService'
import { getAlerts } from '../services/alertService'

const router = useRouter()
const alerts = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const warehouses = ref([])

const filters = reactive({ keyword: '', warehouseId: '', severity: '', status: '' })
const searchDraft = ref('')

const severityOptions = [
  { value: '', label: 'Tất cả mức độ' },
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Cao' },
]

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'OPEN', label: 'Chưa xử lý' },
  { value: 'RESOLVED', label: 'Đã xử lý' },
]

const hasActiveFilters = computed(() => {
  return !!(searchDraft.value.trim() || filters.warehouseId || filters.severity || filters.status)
})

const columns = [
  { key: 'warehouseName', label: 'Kho', class: 'cell-compact' },
  { key: 'productCode', label: 'Mã sản phẩm' },
  { key: 'productName', label: 'Tên sản phẩm' },
  { key: 'severity', label: 'Mức độ', class: 'cell-compact' },
  { key: 'status', label: 'Trạng thái', class: 'cell-compact' },
  { key: 'quantity', label: 'Số lượng', class: 'cell-compact' },
  { key: 'createdAt', label: 'Ngày tạo', class: 'cell-compact' },
]

onMounted(() => {
  fetchWarehouses()
  fetchAlerts()
})

async function fetchWarehouses() {
  try {
    warehouses.value = await getWarehouses({ page: 0, size: 100 }) || []
  } catch (err) {
    // ignore warehouse fetch errors; still allow alerts view to load
    warehouses.value = []
  }
}

async function fetchAlerts() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const params = {
      page: 0,
      size: 50,
      keyword: searchDraft.value.trim() || undefined,
      warehouseId: filters.warehouseId || undefined,
      severity: filters.severity || undefined,
      status: filters.status || undefined,
    }

    const data = await getAlerts(params)
    // Expect backend to return array or paged object; prefer `.content` if present
    alerts.value = Array.isArray(data) ? data : (data?.content || data?.items || [])
  } catch (err) {
    alerts.value = []
    errorMessage.value = err.message || 'Không thể tải cảnh báo. Vui lòng thử lại.'
    if (err.status === 401) router.replace('/login')
  } finally {
    isLoading.value = false
  }
}

function applySearch() {
  filters.keyword = searchDraft.value.trim()
  fetchAlerts()
}

function applyFilter() {
  fetchAlerts()
}

function clearFilters() {
  searchDraft.value = ''
  filters.keyword = ''
  filters.warehouseId = ''
  filters.severity = ''
  filters.status = ''
  fetchAlerts()
}
</script>

<template>
  <PageHeader title="Cảnh báo tồn kho" description="Danh sách cảnh báo tồn kho từ backend. Sử dụng bộ lọc để thu hẹp kết quả." />

  <SearchFilterBar v-model="searchDraft" placeholder="Tìm theo mã/tên sản phẩm" @keyup.enter="applySearch">
    <select v-model="filters.warehouseId" class="select" :disabled="isLoading" @change="applyFilter">
      <option value="">Tất cả kho</option>
      <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.tenKho || w.name || w.warehouseName }}</option>
    </select>

    <select v-model="filters.severity" class="select" :disabled="isLoading" @change="applyFilter">
      <option v-for="opt in severityOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>

    <select v-model="filters.status" class="select" :disabled="isLoading" @change="applyFilter">
      <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>

    <button class="btn btn-primary" type="button" :disabled="isLoading" @click="applySearch">
      <i class="mdi mdi-magnify"></i>
      Tìm
    </button>

    <button v-if="hasActiveFilters" class="btn btn-ghost" type="button" :disabled="isLoading" @click="clearFilters">
      <i class="mdi mdi-filter-remove-outline"></i>
      Xóa lọc
    </button>
  </SearchFilterBar>

  <div v-if="errorMessage" class="card card-pad">
    <i class="mdi mdi-alert-circle-outline"></i>
    <span>{{ errorMessage }}</span>
  </div>

  <div class="alerts-shell">
    <div v-if="isLoading" class="card card-pad">
      <i class="mdi mdi-loading mdi-spin"></i>
      <span>Đang tải cảnh báo...</span>
    </div>

    <DataTable v-else-if="alerts.length > 0" :columns="columns" :rows="alerts" min-width="900px" />

    <EmptyState
      v-else-if="!isLoading && !errorMessage"
      title="Không có cảnh báo"
      description="Hiện không có cảnh báo nào. Thử điều chỉnh bộ lọc hoặc quay lại sau." />
  </div>
</template>
