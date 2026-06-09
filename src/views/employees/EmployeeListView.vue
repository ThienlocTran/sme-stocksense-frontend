<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/PageHeader.vue'
import SearchFilterBar from '../../components/SearchFilterBar.vue'
import DataTable from '../../components/DataTable.vue'
import {
  employeeRoleOptions,
  employeeStatusOptions,
  getRoleLabel,
  getStatusLabel,
} from '../../constants/employeeOptions'
import { createEmployee, getEmployees, updateEmployee } from '../../services/employeeService'

const router = useRouter()
const employees = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const isFormOpen = ref(false)
const formMode = ref('create')
const errorMessage = ref('')
const successMessage = ref('')
const saveErrorMessage = ref('')
const searchDraft = ref('')
const filters = reactive({ keyword: '', status: '', roleCode: '', page: 0, size: 10 })
const pageInfo = reactive({ totalElements: 0, totalPages: 0 })
const form = reactive(createEmptyForm())
const formErrors = reactive({ fullName: '', email: '', phoneNumber: '', password: '', roleCode: '', status: '' })

const columns = [
  { key: 'fullName', label: 'Họ tên' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Số điện thoại' },
  { key: 'role', label: 'Vai trò' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'actions', label: 'Thao tác' },
]

const statusOptions = [{ value: '', label: 'Tất cả trạng thái' }, ...employeeStatusOptions]
const roleOptions = [{ value: '', label: 'Tất cả vai trò' }, ...employeeRoleOptions]
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const currentPage = computed(() => filters.page + 1)
const canGoPrevious = computed(() => filters.page > 0 && !isLoading.value)
const canGoNext = computed(() => filters.page + 1 < pageInfo.totalPages && !isLoading.value)
const isEditMode = computed(() => formMode.value === 'edit')
const formTitle = computed(() => (isEditMode.value ? 'Sửa nhân viên' : 'Thêm nhân viên'))
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

function createEmptyForm() {
  return {
    id: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    roleCode: '',
    status: 'HOAT_DONG',
  }
}

function openCreateForm() {
  formMode.value = 'create'
  Object.assign(form, createEmptyForm())
  successMessage.value = ''
  clearFormFeedback()
  isFormOpen.value = true
}

function openEditForm(employee) {
  formMode.value = 'edit'
  Object.assign(form, {
    id: employee.id,
    fullName: employee.fullName || '',
    email: employee.email || '',
    phoneNumber: employee.phoneNumber || '',
    password: '',
    roleCode: employee.roleCode || 'EMPLOYEE',
    status: employee.status || 'HOAT_DONG',
  })
  successMessage.value = ''
  clearFormFeedback()
  isFormOpen.value = true
}

function closeForm() {
  if (isSaving.value) return
  isFormOpen.value = false
}

async function submitEmployeeForm() {
  if (!validateForm()) return

  isSaving.value = true
  saveErrorMessage.value = ''

  const payload = {
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    phoneNumber: form.phoneNumber.trim() || null,
    roleCode: form.roleCode,
    status: form.status,
  }

  if (!isEditMode.value) {
    payload.password = form.password
  }

  try {
    if (isEditMode.value) {
      await updateEmployee(form.id, payload)
      successMessage.value = 'Cập nhật nhân viên thành công.'
    } else {
      await createEmployee(payload)
      successMessage.value = 'Thêm nhân viên thành công.'
    }

    isFormOpen.value = false
    await fetchEmployees()
  } catch (error) {
    if (error.status === 401) {
      router.replace('/login')
      return
    }

    saveErrorMessage.value = error.message
    applyBackendErrors(error.errors)
  } finally {
    isSaving.value = false
  }
}

function validateForm() {
  clearFormFeedback()
  let isValid = true

  if (!form.fullName.trim()) {
    formErrors.fullName = 'Vui lòng nhập họ tên.'
    isValid = false
  }

  if (!form.email.trim()) {
    formErrors.email = 'Vui lòng nhập email.'
    isValid = false
  } else if (!emailPattern.test(form.email.trim())) {
    formErrors.email = 'Email không hợp lệ.'
    isValid = false
  }

  if (!isEditMode.value) {
    if (!form.password) {
      formErrors.password = 'Vui lòng nhập mật khẩu.'
      isValid = false
    } else if (form.password.length < 8) {
      formErrors.password = 'Mật khẩu tối thiểu 8 ký tự.'
      isValid = false
    }
  }

  if (!form.roleCode) {
    formErrors.roleCode = 'Vui lòng chọn vai trò.'
    isValid = false
  }

  if (!form.status) {
    formErrors.status = 'Vui lòng chọn trạng thái.'
    isValid = false
  }

  return isValid
}

function clearFormFeedback() {
  saveErrorMessage.value = ''
  Object.keys(formErrors).forEach(key => {
    formErrors[key] = ''
  })
}

function applyBackendErrors(errors = {}) {
  Object.keys(formErrors).forEach(key => {
    formErrors[key] = errors?.[key] || ''
  })
}

function displayRole(employee) {
  return getRoleLabel(employee.roleCode, employee.roleName)
}

function displayStatus(status) {
  return getStatusLabel(status)
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
  <PageHeader title="Nhân viên" description="Theo dõi danh sách nhân viên theo vai trò, trạng thái và từ khóa tìm kiếm.">
    <button class="btn btn-primary" type="button" :disabled="isLoading || isSaving" @click="openCreateForm">
      <i class="mdi mdi-account-plus-outline"></i>
      Thêm nhân viên
    </button>
  </PageHeader>

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

  <div v-if="successMessage" class="employee-success card card-pad">
    <i class="mdi mdi-check-circle-outline"></i>
    <span>{{ successMessage }}</span>
  </div>

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
      <template #actions="{ row }">
        <div class="actions">
          <button class="btn btn-sm btn-primary" type="button" :disabled="isLoading || isSaving" @click="openEditForm(row)">Sửa</button>
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

  <div v-if="isFormOpen" class="modal-backdrop">
    <div class="modal employee-modal">
      <form class="employee-form" @submit.prevent="submitEmployeeForm">
        <div class="modal-head between">
          <div>
            <h2 class="section-title">{{ formTitle }}</h2>
            <p class="modal-desc">{{ isEditMode ? 'Cập nhật thông tin nhân viên.' : 'Tạo nhân viên mới với vai trò và trạng thái ban đầu.' }}</p>
          </div>
          <button class="btn btn-icon" type="button" :disabled="isSaving" aria-label="Đóng" @click="closeForm">
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="modal-body grid grid-2">
          <div v-if="saveErrorMessage" class="employee-form-alert">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>{{ saveErrorMessage }}</span>
          </div>

          <label class="field">
            <span>Họ tên</span>
            <input v-model="form.fullName" class="input" type="text" placeholder="Nhập họ tên" :disabled="isSaving" />
            <small v-if="formErrors.fullName" class="field-error">{{ formErrors.fullName }}</small>
          </label>

          <label class="field">
            <span>Email</span>
            <input v-model="form.email" class="input" type="email" placeholder="Nhập email" :disabled="isSaving" />
            <small v-if="formErrors.email" class="field-error">{{ formErrors.email }}</small>
          </label>

          <label class="field">
            <span>Số điện thoại</span>
            <input v-model="form.phoneNumber" class="input" type="tel" placeholder="Nhập số điện thoại" :disabled="isSaving" />
            <small v-if="formErrors.phoneNumber" class="field-error">{{ formErrors.phoneNumber }}</small>
          </label>

          <label v-if="!isEditMode" class="field">
            <span>Mật khẩu</span>
            <input v-model="form.password" class="input" type="password" placeholder="Tối thiểu 8 ký tự" :disabled="isSaving" autocomplete="new-password" />
            <small v-if="formErrors.password" class="field-error">{{ formErrors.password }}</small>
          </label>

          <label class="field">
            <span>Vai trò</span>
            <select v-model="form.roleCode" class="select" :disabled="isSaving">
              <option value="" disabled>Chọn vai trò</option>
              <option v-for="option in employeeRoleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <small v-if="formErrors.roleCode" class="field-error">{{ formErrors.roleCode }}</small>
          </label>

          <label class="field">
            <span>Trạng thái</span>
            <select v-model="form.status" class="select" :disabled="isSaving">
              <option v-for="option in employeeStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <small v-if="formErrors.status" class="field-error">{{ formErrors.status }}</small>
          </label>
        </div>

        <div class="modal-foot">
          <button class="btn" type="button" :disabled="isSaving" @click="closeForm">Hủy</button>
          <button class="btn btn-primary" type="submit" :disabled="isSaving">
            <i v-if="isSaving" class="mdi mdi-loading mdi-spin"></i>
            {{ isSaving ? 'Đang lưu' : 'Lưu' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.employee-alert, .employee-success { margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.employee-alert { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
.employee-success { color: #166534; background: #f0fdf4; border-color: #bbf7d0; }
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
.employee-modal { width: min(760px, 100%); }
.employee-form { margin: 0; }
.modal-desc { margin: 4px 0 0; color: var(--muted); }
.employee-form-alert { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; font-weight: 600; }
.field > span { color: #374151; font-weight: 600; }
.field-error { color: var(--danger); font-weight: 600; line-height: 18px; }
.btn:disabled, .select:disabled { opacity: 0.6; cursor: not-allowed; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .employee-pagination, .pagination-actions { align-items: stretch; flex-direction: column; width: 100%; }
  .page-size, .pagination-actions .btn, .page-indicator { width: 100%; }
  .modal-foot { flex-direction: column-reverse; }
  .modal-foot .btn { width: 100%; }
}
</style>
