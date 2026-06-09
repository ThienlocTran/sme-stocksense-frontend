<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/PageHeader.vue'
import SearchFilterBar from '../../components/SearchFilterBar.vue'
import DataTable from '../../components/DataTable.vue'
import { getEmployees } from '../../services/employeeService'

const router = useRouter()
const employees = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const searchDraft = ref('')
const filters = reactive({ keyword: '', status: '', roleCode: '', page: 0, size: 10 })
const pageInfo = reactive({ totalElements: 0, totalPages: 0 })

const columns = [
  { key: 'fullName', label: 'Họ tên' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Số điện thoại' },
  { key: 'role', label: 'Vai trò' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'actions', label: 'Thao tác' },
]

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'HOAT_DONG', label: 'Hoạt động' },
  { value: 'TAM_KHOA', label: 'Tạm khóa' },
  { value: 'NGUNG_HOAT_DONG', label: 'Ngừng hoạt động' },
]

const roleOptions = [
  { value: '', label: 'Tất cả vai trò' },
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'MANAGER', label: 'Quản lý kho' },
  { value: 'EMPLOYEE', label: 'Nhân viên kho' },
]

const currentPage = computed(() => filters.page + 1)
const canGoPrevious = computed(() => filters.page > 0 && !isLoading.value)
const canGoNext = computed(() => filters.page + 1 < pageInfo.totalPages && !isLoading.value)
const rangeText = computed(() => {
  if (pageInfo.totalElements === 0) return '0 nhân viên'
  const start = filters.page * filters.size + 1
  const end = Math.min((filters.page + 1) * filters.size, pageInfo.totalElements)
  return `${start}-${end} / ${pageInfo.totalElements} nhân viên`
})

onMounted(() => {
  fetchEmployees()
})

async function fetchEmployees() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const data = await getEmployees(filters)
    employees.value = data.content || []
    filters.page = data.page || 0
    filters.size = data.size || filters.size
    pageInfo.totalElements = data.totalElements || 0
    pageInfo.totalPages = data.totalPages || 0
  } catch (error) {
    employees.value = []
    pageInfo.totalElements = 0
    pageInfo.totalPages = 0
    errorMessage.value = error.message
    if (error.status === 401) router.replace('/login')
  } finally {
    isLoading.value = false
  }
}

function applySearch() {
  filters.keyword = searchDraft.value.trim()
  filters.page = 0
  fetchEmployees()
}

function applyFilter() {
  filters.page = 0
  fetchEmployees()
}

function goPrevious() {
  if (!canGoPrevious.value) return
  filters.page -= 1
  fetchEmployees()
}

function goNext() {
  if (!canGoNext.value) return
  filters.page += 1
  fetchEmployees()
}

function displayRole(employee) {
  if (employee.roleName) return employee.roleName
  return roleOptions.find(option => option.value === employee.roleCode)?.label || employee.roleCode || '-'
}

function displayStatus(status) {
  return statusOptions.find(option => option.value === status)?.label || status || '-'
}

function statusClass(status) {
  return {
    'employee-status-active': status === 'HOAT_DONG',
    'employee-status-locked': status === 'TAM_KHOA',
    'employee-status-inactive': status === 'NGUNG_HOAT_DONG',
  }
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}
</script>

<template>
  <PageHeader title="Nhân viên" description="Theo dõi danh sách nhân viên theo vai trò, trạng thái và từ khóa tìm kiếm." />

  <SearchFilterBar v-model="searchDraft" placeholder="Tìm theo họ tên hoặc email">
    <button class="btn btn-primary" type="button" :disabled="isLoading" @click="applySearch">
      <i class="mdi mdi-magnify"></i>
      Tìm kiếm
    </button>
    <select v-model="filters.status" class="select" :disabled="isLoading" @change="applyFilter">
      <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <select v-model="filters.roleCode" class="select" :disabled="isLoading" @change="applyFilter">
      <option v-for="option in roleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
  </SearchFilterBar>

  <div v-if="errorMessage" class="employee-alert card card-pad">
    <i class="mdi mdi-alert-circle-outline"></i>
    <span>{{ errorMessage }}</span>
  </div>

  <div class="employee-table-shell">
    <div v-if="isLoading" class="employee-loading card card-pad">
      <i class="mdi mdi-loading mdi-spin"></i>
      Đang tải danh sách nhân viên
    </div>

    <DataTable v-else :columns="columns" :rows="employees" empty-text="Không có nhân viên phù hợp">
      <template #phoneNumber="{ value }">{{ value || '-' }}</template>
      <template #role="{ row }">{{ displayRole(row) }}</template>
      <template #status="{ value }">
        <span class="employee-status" :class="statusClass(value)">{{ displayStatus(value) }}</span>
      </template>
      <template #createdAt="{ value }">{{ formatDate(value) }}</template>
      <template #actions>
        <div class="actions">
          <button class="btn btn-sm" type="button" disabled>Sửa</button>
          <button class="btn btn-sm" type="button" disabled>Khóa/Mở khóa</button>
          <button class="btn btn-sm" type="button" disabled>Reset mật khẩu</button>
        </div>
      </template>
    </DataTable>
  </div>

  <div class="employee-pagination card card-pad">
    <span class="muted">{{ rangeText }}</span>
    <div class="pagination-actions">
      <select v-model.number="filters.size" class="select page-size" :disabled="isLoading" @change="applyFilter">
        <option :value="10">10 / trang</option>
        <option :value="20">20 / trang</option>
        <option :value="50">50 / trang</option>
      </select>
      <button class="btn btn-sm" type="button" :disabled="!canGoPrevious" @click="goPrevious">
        <i class="mdi mdi-chevron-left"></i>
        Trước
      </button>
      <span class="page-indicator">Trang {{ currentPage }} / {{ pageInfo.totalPages || 1 }}</span>
      <button class="btn btn-sm" type="button" :disabled="!canGoNext" @click="goNext">
        Sau
        <i class="mdi mdi-chevron-right"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.employee-alert { margin-bottom: 16px; display: flex; align-items: center; gap: 10px; color: #991b1b; background: #fef2f2; border-color: #fecaca; }
.employee-table-shell { position: relative; }
.employee-loading { min-height: 220px; display: grid; place-items: center; gap: 10px; color: var(--muted); font-weight: 700; }
.mdi-spin { animation: spin 0.8s linear infinite; }
.employee-status { display: inline-flex; align-items: center; min-height: 26px; border-radius: 999px; padding: 4px 9px; font-size: 12px; font-weight: 800; white-space: nowrap; background: #e2e8f0; color: #334155; }
.employee-status-active { background: #dcfce7; color: #15803d; }
.employee-status-locked { background: #fef3c7; color: #b45309; }
.employee-status-inactive { background: #e2e8f0; color: #334155; }
.employee-pagination { margin-top: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.pagination-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.page-size { width: 130px; min-height: 34px; }
.page-indicator { min-width: 112px; text-align: center; color: var(--muted); font-weight: 700; }
.btn:disabled, .select:disabled { opacity: 0.6; cursor: not-allowed; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .employee-pagination, .pagination-actions { align-items: stretch; flex-direction: column; width: 100%; }
  .page-size, .pagination-actions .btn, .page-indicator { width: 100%; }
}
</style>
