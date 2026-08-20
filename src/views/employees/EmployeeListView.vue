<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '../../components/PageHeader.vue'
import SearchFilterBar from '../../components/SearchFilterBar.vue'
import DataTable from '../../components/DataTable.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import {
  employeeRoleOptions,
  employeeStatusOptions,
  getRoleLabel,
  getStatusLabel,
} from '../../constants/employeeOptions'
import { getCurrentRoleCode } from '../../services/authService'
import { createEmployee, getEmployees, lockEmployee, resetEmployeePassword, unlockEmployee, updateEmployee } from '../../services/employeeService'

const router = useRouter()
const { t } = useI18n()
const employees = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const isFormOpen = ref(false)
const isResetOpen = ref(false)
const isResetting = ref(false)
const statusUpdatingId = ref(null)
const formMode = ref('create')
const errorMessage = ref('')
const successMessage = ref('')
const saveErrorMessage = ref('')
const resetErrorMessage = ref('')
const resetEmployee = ref(null)
const searchDraft = ref('')
const filters = reactive({ keyword: '', status: '', roleCode: '', page: 0, size: 10 })
const pageInfo = reactive({ totalElements: 0, totalPages: 0 })
const form = reactive(createEmptyForm())
const formErrors = reactive({ fullName: '', email: '', phoneNumber: '', password: '', roleCode: '', status: '' })
const resetForm = reactive({ newPassword: '', confirmPassword: '' })
const resetErrors = reactive({ newPassword: '', confirmPassword: '' })
const activeDropdownId = ref(null)

const statusOptions = [{ value: '', label: t('employee.status.all') }, ...employeeStatusOptions]
const roleOptions = [{ value: '', label: t('employee.role.all') }, ...employeeRoleOptions]
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const currentPage = computed(() => filters.page + 1)
const canGoPrevious = computed(() => filters.page > 0 && !isLoading.value)
const canGoNext = computed(() => filters.page + 1 < pageInfo.totalPages && !isLoading.value)
const isEditMode = computed(() => formMode.value === 'edit')
const canManageEmployees = computed(() => getCurrentRoleCode() === 'ADMIN')

const columns = [
  { key: 'fullName', label: t('employee.columns.name'), class: 'employee-name-column' },
  { key: 'email', label: t('employee.columns.email'), class: 'employee-email-column' },
  { key: 'phoneNumber', label: t('employee.columns.phone'), class: 'employee-phone-column' },
  { key: 'role', label: t('employee.columns.role'), class: 'employee-role-column' },
  { key: 'status', label: t('employee.columns.status'), class: 'employee-status-column' },
  { key: 'actions', label: t('employee.columns.actions'), class: 'employee-actions-column text-right' }
]

const formTitle = computed(() => {
  return isEditMode.value ? t('employee.formTitle.edit') : t('employee.formTitle.create')
})

const formDesc = computed(() => {
  return isEditMode.value ? t('employee.formDesc.edit') : t('employee.formDesc.create')
})

const rangeText = computed(() => {
  if (pageInfo.totalElements === 0) return t('employee.pagination.zero')
  const start = filters.page * filters.size + 1
  const end = Math.min((filters.page + 1) * filters.size, pageInfo.totalElements)
  return `${start}-${end} / ${pageInfo.totalElements} nhân viên`
})

onMounted(() => {
  fetchEmployees()
  window.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick)
})

function handleOutsideClick(event) {
  if (!event.target.closest('.action-dropdown')) {
    closeAllDropdowns()
  }
}

function toggleDropdown(id) {
  activeDropdownId.value = activeDropdownId.value === id ? null : id
}

function closeAllDropdowns() {
  activeDropdownId.value = null
}

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

const searchDebounceTimer = ref(null)
watch(searchDraft, (newVal) => {
  if (searchDebounceTimer.value) clearTimeout(searchDebounceTimer.value)
  searchDebounceTimer.value = setTimeout(() => {
    filters.keyword = newVal.trim()
    filters.page = 0
    fetchEmployees()
  }, 300)
})

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

function getToggleStatusLabel(employee) {
  if (employee.status === 'HOAT_DONG') return t('employee.btn.lock')
  return t('employee.btn.unlock')
}

function isStatusToggleDisabled(employee) {
  return employee.status === 'NGUNG_HOAT_DONG'
}

// Confirmation State
const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmDanger = ref(false)
const pendingEmployee = ref(null)

function confirmToggleStatus(employee) {
  if (!canManageEmployees.value || !employee?.id || statusUpdatingId.value || isStatusToggleDisabled(employee)) return

  pendingEmployee.value = employee
  const shouldLock = employee.status === 'HOAT_DONG'
  confirmTitle.value = shouldLock ? t('employee.confirm.lockTitle') : t('employee.confirm.unlockTitle')
  confirmMessage.value = `${t(shouldLock ? 'employee.confirm.lockMsgPrefix' : 'employee.confirm.unlockMsgPrefix')} "${employee.fullName}" (${employee.email}) ${t('employee.confirm.msgSuffix')}`
  confirmDanger.value = shouldLock
  confirmOpen.value = true
}

function cancelToggle() {
  pendingEmployee.value = null
  confirmOpen.value = false
}

async function executeToggleEmployeeStatus() {
  if (!pendingEmployee.value) return
  
  const employee = pendingEmployee.value
  const shouldLock = employee.status === 'HOAT_DONG'
  statusUpdatingId.value = employee.id
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (shouldLock) {
      await lockEmployee(employee.id)
    } else {
      await unlockEmployee(employee.id)
    }
    successMessage.value = shouldLock ? t('employee.alert.lockSuccess') : t('employee.alert.unlockSuccess')
    await fetchEmployees()
  } catch (error) {
    if (error.status === 401) {
      router.replace('/login')
      return
    }
    errorMessage.value = error.message
  } finally {
    statusUpdatingId.value = null
    confirmOpen.value = false
    pendingEmployee.value = null
  }
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
  if (!canManageEmployees.value) return
  closeAllDropdowns()
  formMode.value = 'create'
  Object.assign(form, createEmptyForm())
  successMessage.value = ''
  clearFormFeedback()
  isFormOpen.value = true
}

function openEditForm(employee) {
  if (!canManageEmployees.value) return
  closeAllDropdowns()
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
  if (!canManageEmployees.value) return
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
      successMessage.value = t('employee.alert.updateSuccess')
    } else {
      await createEmployee(payload)
      successMessage.value = t('employee.alert.createSuccess')
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
    formErrors.fullName = t('employee.validation.fullNameRequired')
    isValid = false
  }

  if (!form.email.trim()) {
    formErrors.email = t('employee.validation.emailRequired')
    isValid = false
  } else if (!emailPattern.test(form.email.trim())) {
    formErrors.email = t('employee.validation.emailInvalid')
    isValid = false
  }

  if (isDuplicatePhoneNumber()) {
    formErrors.phoneNumber = t('employee.validation.phoneDuplicate')
    isValid = false
  }

  if (!isEditMode.value) {
    if (!form.password) {
      formErrors.password = t('employee.validation.passwordRequired')
      isValid = false
    } else if (form.password.length < 8) {
      formErrors.password = t('employee.validation.passwordMin')
      isValid = false
    }
  }

  if (!form.roleCode) {
    formErrors.roleCode = t('employee.validation.roleRequired')
    isValid = false
  }

  if (!form.status) {
    formErrors.status = t('employee.validation.statusRequired')
    isValid = false
  }

  return isValid
}

function isDuplicatePhoneNumber() {
  const phoneNumber = form.phoneNumber.trim()
  if (!phoneNumber) return false

  return employees.value.some(employee => (
    employee.phoneNumber?.trim() === phoneNumber && String(employee.id) !== String(form.id)
  ))
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

function openResetPassword(employee) {
  if (!canManageEmployees.value) return
  closeAllDropdowns()
  resetEmployee.value = employee
  successMessage.value = ''
  clearResetFeedback()
  isResetOpen.value = true
}

function closeResetPassword() {
  if (isResetting.value) return
  isResetOpen.value = false
  clearResetForm()
}

async function submitResetPassword() {
  if (!canManageEmployees.value) return
  if (!validateResetForm() || !resetEmployee.value) return

  isResetting.value = true
  resetErrorMessage.value = ''

  try {
    const data = await resetEmployeePassword(resetEmployee.value.id, resetForm.newPassword)
    successMessage.value = data?.message || t('employee.alert.resetSuccess')
    isResetOpen.value = false
    clearResetForm()
  } catch (error) {
    if (error.status === 401) {
      isResetOpen.value = false
      clearResetForm()
      router.replace('/login')
      return
    }

    resetErrorMessage.value = error.message
    applyResetBackendErrors(error.errors)
  } finally {
    isResetting.value = false
  }
}

function validateResetForm() {
  clearResetFeedback()
  let isValid = true

  if (!resetForm.newPassword) {
    resetErrors.newPassword = t('employee.validation.newPasswordRequired')
    isValid = false
  } else if (resetForm.newPassword.length < 8) {
    resetErrors.newPassword = t('employee.validation.newPasswordMin')
    isValid = false
  }

  if (!resetForm.confirmPassword) {
    resetErrors.confirmPassword = t('employee.validation.confirmPasswordRequired')
    isValid = false
  } else if (resetForm.confirmPassword !== resetForm.newPassword) {
    resetErrors.confirmPassword = t('employee.validation.passwordMismatch')
    isValid = false
  }

  return isValid
}

function clearResetFeedback() {
  resetErrorMessage.value = ''
  resetErrors.newPassword = ''
  resetErrors.confirmPassword = ''
}

function clearResetForm() {
  resetForm.newPassword = ''
  resetForm.confirmPassword = ''
  clearResetFeedback()
  resetEmployee.value = null
}

function applyResetBackendErrors(errors = {}) {
  resetErrors.newPassword = errors?.newPassword || errors?.password || ''
  resetErrors.confirmPassword = errors?.confirmPassword || ''
}

function displayRole(employee) {
  if (employee.roleCode === 'ADMIN') return t('employee.roleLabel.admin')
  if (employee.roleCode === 'MANAGER') return t('employee.roleLabel.manager')
  if (employee.roleCode === 'EMPLOYEE') return t('employee.roleLabel.employee')
  return getRoleLabel(employee.roleCode, employee.roleName)
}

function displayStatus(status) {
  if (status === 'HOAT_DONG') return t('employee.statusLabel.active')
  if (status === 'TAM_KHOA') return t('employee.statusLabel.locked')
  if (status === 'NGUNG_HOAT_DONG') return t('employee.statusLabel.inactive')
  return getStatusLabel(status)
}

function statusClass(status) {
  return {
    'employee-status-active': status === 'HOAT_DONG',
    'employee-status-locked': status === 'TAM_KHOA',
    'employee-status-inactive': status === 'NGUNG_HOAT_DONG',
  }
}

function editModalResetPassword() {
  const row = {
    id: form.id,
    fullName: form.fullName,
    email: form.email
  }
  closeForm()
  openResetPassword(row)
}

function editModalToggleStatus() {
  const row = {
    id: form.id,
    fullName: form.fullName,
    email: form.email,
    status: form.status
  }
  closeForm()
  confirmToggleStatus(row)
}
</script>

<template>
  <PageHeader :title="t('employee.title')" :description="t('employee.description')">
    <button v-if="canManageEmployees" class="btn btn-primary employee-create-btn" type="button" :disabled="isLoading || isSaving" @click="openCreateForm">
      <i class="mdi mdi-account-plus-outline"></i>
      {{ t('employee.btn.create') }}
    </button>
  </PageHeader>

  <SearchFilterBar v-model="searchDraft" class="employee-filter-bar" :placeholder="t('employee.searchPlaceholder')">
    <button class="btn btn-primary" type="button" :disabled="isLoading" @click="applySearch">
      <i class="mdi mdi-magnify"></i>
      {{ t('employee.btn.search') }}
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
      {{ t('employee.alert.loading') }}
    </div>

    <DataTable v-else :columns="columns" :rows="employees" :empty-text="t('employee.table.empty')" min-width="1000px">
      <template #fullName="{ value }">
        <strong class="text-sm font-semibold text-zinc-900">{{ value }}</strong>
      </template>
      <template #phoneNumber="{ value }">{{ value || '-' }}</template>
      <template #role="{ row }">{{ displayRole(row) }}</template>
      <template #status="{ value }">
        <span class="employee-status" :class="statusClass(value)">{{ displayStatus(value) }}</span>
      </template>
      <template #actions="{ row }">
        <div class="actions employee-actions justify-end">
          <button class="btn btn-sm btn-secondary" type="button" :disabled="isLoading || isSaving" @click="openEditForm(row)">{{ t('employee.btn.edit') }}</button>
          
          <div class="action-dropdown" :class="{ 'dropdown-active': activeDropdownId === row.id }">
            <button class="btn btn-sm btn-icon" type="button" :disabled="isLoading" @click.stop="toggleDropdown(row.id)">
              <i class="mdi mdi-dots-horizontal"></i>
            </button>
            <div v-if="activeDropdownId === row.id" class="dropdown-menu">
              <button class="dropdown-item" type="button" :disabled="isStatusToggleDisabled(row) || statusUpdatingId" @click="confirmToggleStatus(row)">
                {{ getToggleStatusLabel(row) }}
              </button>
              <button class="dropdown-item" type="button" :disabled="isResetting" @click="openResetPassword(row)">
                {{ t('employee.btn.resetPassword') }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </DataTable>
  </div>

  <div class="employee-pagination card card-pad">
    <span class="muted">{{ rangeText }}</span>
    <div class="pagination-actions">
      <select v-model.number="filters.size" class="select page-size" :disabled="isLoading" @change="applyFilter">
        <option :value="10">10 {{ t('employee.pagination.pageSize') }}</option>
        <option :value="20">20 {{ t('employee.pagination.pageSize') }}</option>
        <option :value="50">50 {{ t('employee.pagination.pageSize') }}</option>
      </select>
      <button class="btn btn-sm" type="button" :disabled="!canGoPrevious" @click="goPrevious">
        <i class="mdi mdi-chevron-left"></i>
        Trước
      </button>
      <span class="page-indicator">{{ t('employee.pagination.page') }} {{ currentPage }} / {{ pageInfo.totalPages || 1 }}</span>
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
            <p class="modal-desc">{{ formDesc }}</p>
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

          <!-- Section: {{ t('employee.form.sectionPersonal') }} -->
          <div class="form-section-title col-span-2">THÔNG TIN NHÂN SỰ</div>

          <label class="field">
            <span>{{ t('employee.form.fullName') }}</span>
            <input v-model="form.fullName" class="input" type="text" :placeholder="t('employee.form.placeholder.fullName')" :disabled="isSaving" />
            <small v-if="formErrors.fullName" class="field-error">{{ formErrors.fullName }}</small>
          </label>

          <label class="field">
            <span>{{ t('employee.form.email') }}</span>
            <input v-model="form.email" class="input" type="email" :placeholder="t('employee.form.placeholder.email')" :disabled="isSaving" />
            <small v-if="formErrors.email" class="field-error">{{ formErrors.email }}</small>
          </label>

          <label class="field">
            <span>{{ t('employee.form.phone') }}</span>
            <input v-model="form.phoneNumber" class="input" type="tel" :placeholder="t('employee.form.placeholder.phone')" :disabled="isSaving" />
            <small v-if="formErrors.phoneNumber" class="field-error">{{ formErrors.phoneNumber }}</small>
          </label>

          <label class="field">
            <span>{{ t('employee.form.status') }}</span>
            <select v-model="form.status" class="select" :disabled="isSaving">
              <option v-for="option in employeeStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <small v-if="formErrors.status" class="field-error">{{ formErrors.status }}</small>
          </label>

          <label v-if="!isEditMode" class="field col-span-2">
            <span>{{ t('employee.form.password') }}</span>
            <input v-model="form.password" class="input" type="password" :placeholder="t('employee.form.placeholder.password')" :disabled="isSaving" autocomplete="new-password" />
            <small v-if="formErrors.password" class="field-error">{{ formErrors.password }}</small>
          </label>

          <!-- Section: {{ t('employee.form.sectionAccount') }} -->
          <div class="form-section-title col-span-2">TÀI KHOẢN HỆ THỐNG</div>

          <label class="field col-span-2">
            <span>{{ t('employee.form.role') }}</span>
            <select v-model="form.roleCode" class="select" :disabled="isSaving">
              <option value="" disabled>{{ t('employee.form.placeholder.role') }}</option>
              <option v-for="option in employeeRoleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <small v-if="formErrors.roleCode" class="field-error">{{ formErrors.roleCode }}</small>
          </label>

          <!-- Section: {{ t('employee.form.sectionSecurity') }} (only when editing) -->
          <template v-if="isEditMode">
            <div class="form-section-title col-span-2">BẢO MẬT TÀI KHOẢN</div>
            <div class="security-actions col-span-2">
              <button class="btn btn-secondary" type="button" @click="editModalResetPassword">
                <i class="mdi mdi-key-variant"></i> Reset mật khẩu
              </button>
              <button class="btn" :class="form.status === 'HOAT_DONG' ? 'btn-danger' : 'btn-success'" type="button" :disabled="isStatusToggleDisabled(form)" @click="editModalToggleStatus">
                <i class="mdi" :class="form.status === 'HOAT_DONG' ? 'mdi-lock-outline' : 'mdi-lock-open-outline'"></i>
                {{ form.status === 'HOAT_DONG' ? t('employee.btn.lock') : t('employee.btn.unlock') }}
              </button>
            </div>
          </template>
        </div>

        <div class="modal-foot">
          <button class="btn" type="button" :disabled="isSaving" @click="closeForm">{{ t('employee.btn.cancel') }}</button>
          <button class="btn btn-primary" type="submit" :disabled="isSaving">
            <i v-if="isSaving" class="mdi mdi-loading mdi-spin"></i>
            {{ isSaving ? t('employee.btn.saving') : t('employee.btn.save') }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="isResetOpen" class="modal-backdrop">
    <div class="modal employee-modal">
      <form class="employee-form" @submit.prevent="submitResetPassword">
        <div class="modal-head between">
          <div>
            <h2 class="section-title">{{ t('employee.reset.title') }}</h2>
            <p class="modal-desc">{{ resetEmployee?.fullName }} - {{ resetEmployee?.email }}</p>
          </div>
          <button class="btn btn-icon" type="button" :disabled="isResetting" aria-label="Đóng" @click="closeResetPassword">
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="modal-body grid grid-2">
          <div v-if="resetErrorMessage" class="employee-form-alert">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>{{ resetErrorMessage }}</span>
          </div>

          <label class="field col-span-2">
            <span>{{ t('employee.reset.newPassword') }}</span>
            <input v-model="resetForm.newPassword" class="input" type="password" placeholder="Tối thiểu 8 ký tự" :disabled="isResetting" autocomplete="new-password" />
            <small v-if="resetErrors.newPassword" class="field-error">{{ resetErrors.newPassword }}</small>
          </label>

          <label class="field col-span-2">
            <span>{{ t('employee.reset.confirmPassword') }}</span>
            <input v-model="resetForm.confirmPassword" class="input" type="password" :placeholder="t('employee.reset.placeholder.confirm')" :disabled="isResetting" autocomplete="new-password" />
            <small v-if="resetErrors.confirmPassword" class="field-error">{{ resetErrors.confirmPassword }}</small>
          </label>
        </div>

        <div class="modal-foot">
          <button class="btn" type="button" :disabled="isResetting" @click="closeResetPassword">Hủy</button>
          <button class="btn btn-primary" type="submit" :disabled="isResetting">
            <i v-if="isResetting" class="mdi mdi-loading mdi-spin"></i>
            {{ isResetting ? t('employee.btn.saving') : t('employee.reset.btn') }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Confirm Dialog for status changes -->
  <ConfirmDialog
    :open="confirmOpen"
    :title="confirmTitle"
    :message="confirmMessage"
    :confirm-text="t('employee.confirm.confirmBtn')"
    :danger="confirmDanger"
    :loading="statusUpdatingId !== null"
    @cancel="cancelToggle"
    @confirm="executeToggleEmployeeStatus"
  />
</template>

<style scoped>
.employee-create-btn { white-space: nowrap; }
.employee-filter-bar { margin-bottom: 18px; }
.employee-alert, .employee-success { margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.employee-alert { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
.employee-success { color: #166534; background: #f0fdf4; border-color: #bbf7d0; }
.employee-table-shell { position: relative; margin-top: 6px; }
.employee-actions { display: inline-flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: nowrap; min-width: max-content; }
.employee-actions .btn { min-height: 32px; padding-inline: 10px; white-space: nowrap; word-break: keep-all; }
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

/* Group titles inside edit/create modal */
.form-section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-top: 12px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 4px;
}
.security-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.col-span-2 {
  grid-column: span 2 / span 2;
}

/* Action Dropdown styling */
.action-dropdown {
  position: relative;
  display: inline-block;
}
.dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 30;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  padding: 4px;
}
.dropdown-item {
  background: transparent;
  border: 0;
  border-radius: 6px;
  padding: 8px 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  width: 100%;
  cursor: pointer;
  transition: background-color 120ms ease;
}
.dropdown-item:hover:not(:disabled) {
  background: var(--color-bg);
}
.dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

:deep(.employee-name-column) { min-width: 170px; }
:deep(.employee-email-column) { min-width: 220px; }
:deep(.employee-phone-column),
:deep(.employee-role-column),
:deep(.employee-status-column) { min-width: 132px; }
:deep(.employee-actions-column) { min-width: 150px; text-align: right; white-space: nowrap; overflow-wrap: normal; }

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
