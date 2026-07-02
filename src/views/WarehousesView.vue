<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import DataTable from '../components/DataTable.vue'
import EmptyState from '../components/EmptyState.vue'
import PageHeader from '../components/PageHeader.vue'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { getWarehouseStatusLabel, warehouseStatusOptions } from '../constants/warehouseOptions'
import { canManageWarehouses } from '../services/permissionService'
import { createWarehouse, getWarehouses, updateWarehouse } from '../services/warehouseService'

const router = useRouter()
const warehouses = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const togglingId = ref(null)
const pendingWarehouse = ref(null)
const isFormOpen = ref(false)
const formMode = ref('create')
const errorMessage = ref('')
const successMessage = ref('')
const saveErrorMessage = ref('')
const searchDraft = ref('')
const filters = reactive({ keyword: '', status: '' })

const statusOptions = [{ value: '', label: 'Tất cả trạng thái' }, ...warehouseStatusOptions]
const canManage = computed(() => canManageWarehouses())
const isEditMode = computed(() => formMode.value === 'edit')
const formTitle = computed(() => isEditMode.value ? 'Sửa kho hàng' : 'Thêm kho hàng')
const hasActiveFilters = computed(() => filters.keyword !== '' || filters.status !== '')
const confirmTitle = computed(() => pendingWarehouse.value?.trangThai === 'HOAT_DONG' ? 'Ngừng hoạt động kho?' : 'Kích hoạt kho?')
const confirmMessage = computed(() => pendingWarehouse.value
  ? `Bạn muốn ${pendingWarehouse.value.trangThai === 'HOAT_DONG' ? 'ngừng hoạt động' : 'kích hoạt'} "${pendingWarehouse.value.tenKho}"?`
  : '')

const columns = computed(() => {
  const baseColumns = [
  { key: 'maKho', label: 'Mã kho', class: 'cell-compact' },
  { key: 'tenKho', label: 'Tên kho' },
  { key: 'diaChi', label: 'Địa chỉ' },
  { key: 'trangThai', label: 'Trạng thái', class: 'cell-nowrap' },
  ]
  return canManage.value
    ? [...baseColumns, { key: 'actions', label: 'Thao tác', class: 'cell-nowrap' }]
    : baseColumns
})

const form = reactive(createEmptyForm())
const formErrors = reactive({ maKho: '', tenKho: '', diaChi: '', trangThai: '' })

onMounted(fetchWarehouses)

async function fetchWarehouses() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    warehouses.value = await getWarehouses({
      keyword: filters.keyword,
      status: filters.status,
    }) || []
  } catch (error) {
    warehouses.value = []
    errorMessage.value = error.message
    if (error.status === 401) router.replace('/login')
  } finally {
    isLoading.value = false
  }
}

function applySearch() {
  filters.keyword = searchDraft.value.trim()
  fetchWarehouses()
}

function applyFilter() {
  fetchWarehouses()
}

function clearFilters() {
  searchDraft.value = ''
  filters.keyword = ''
  filters.status = ''
  fetchWarehouses()
}

function createEmptyForm() {
  return { id: '', maKho: '', tenKho: '', diaChi: '', trangThai: 'HOAT_DONG' }
}

function openCreateForm() {
  if (!canManage.value) return
  formMode.value = 'create'
  Object.assign(form, createEmptyForm())
  successMessage.value = ''
  clearFormFeedback()
  isFormOpen.value = true
}

function openEditForm(warehouse) {
  if (!canManage.value) return
  formMode.value = 'edit'
  Object.assign(form, {
    id: warehouse.id,
    maKho: warehouse.maKho || '',
    tenKho: warehouse.tenKho || '',
    diaChi: warehouse.diaChi || '',
    trangThai: warehouse.trangThai || 'HOAT_DONG',
  })
  successMessage.value = ''
  clearFormFeedback()
  isFormOpen.value = true
}

function closeForm() {
  if (isSaving.value) return
  isFormOpen.value = false
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

function validateForm() {
  clearFormFeedback()
  let isValid = true

  if (!isEditMode.value) {
    if (!form.maKho.trim()) {
      formErrors.maKho = 'Mã kho không được để trống.'
      isValid = false
    } else if (form.maKho.trim().length > 50) {
      formErrors.maKho = 'Mã kho không được vượt quá 50 ký tự.'
      isValid = false
    }
  }

  if (!form.tenKho.trim()) {
    formErrors.tenKho = 'Tên kho không được để trống.'
    isValid = false
  } else if (form.tenKho.trim().length > 150) {
    formErrors.tenKho = 'Tên kho không được vượt quá 150 ký tự.'
    isValid = false
  }

  if (form.diaChi && form.diaChi.trim().length > 255) {
    formErrors.diaChi = 'Địa chỉ không được vượt quá 255 ký tự.'
    isValid = false
  }

  if (!form.trangThai) {
    formErrors.trangThai = 'Trạng thái không được để trống.'
    isValid = false
  }

  return isValid
}

async function submitWarehouseForm() {
  if (!canManage.value) return
  if (!validateForm()) return

  isSaving.value = true
  saveErrorMessage.value = ''

  try {
    if (isEditMode.value) {
      await updateWarehouse(form.id, {
        tenKho: form.tenKho.trim(),
        diaChi: form.diaChi ? form.diaChi.trim() : null,
        trangThai: form.trangThai,
      })
      successMessage.value = 'Cập nhật kho hàng thành công.'
    } else {
      await createWarehouse({
        maKho: form.maKho.trim(),
        tenKho: form.tenKho.trim(),
        diaChi: form.diaChi ? form.diaChi.trim() : null,
        trangThai: form.trangThai,
      })
      successMessage.value = 'Thêm kho hàng mới thành công.'
    }

    isFormOpen.value = false
    await fetchWarehouses()
  } catch (error) {
    if (error.status === 401) {
      isFormOpen.value = false
      router.replace('/login')
      return
    }
    saveErrorMessage.value = error.message
    applyBackendErrors(error.errors)
  } finally {
    isSaving.value = false
  }
}

function requestStatus(warehouse) {
  if (!canManage.value || togglingId.value) return
  pendingWarehouse.value = warehouse
}

async function confirmStatus() {
  const warehouse = pendingWarehouse.value
  if (!warehouse || !canManage.value) return

  const nextStatus = warehouse.trangThai === 'HOAT_DONG' ? 'NGUNG_HOAT_DONG' : 'HOAT_DONG'
  togglingId.value = warehouse.id
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await updateWarehouse(warehouse.id, {
      tenKho: warehouse.tenKho,
      diaChi: warehouse.diaChi || null,
      trangThai: nextStatus,
    })
    successMessage.value = nextStatus === 'HOAT_DONG' ? 'Đã kích hoạt kho hàng.' : 'Đã ngừng hoạt động kho hàng.'
    pendingWarehouse.value = null
    await fetchWarehouses()
  } catch (error) {
    errorMessage.value = error.message
    if (error.status === 401) router.replace('/login')
  } finally {
    togglingId.value = null
  }
}

function displayStatus(status) {
  return getWarehouseStatusLabel(status)
}
</script>

<template>
  <PageHeader title="Kho hàng" description="Quản lý danh sách kho ở mức cơ bản, chưa dùng sơ đồ kệ/vị trí.">
    <button
      v-if="canManage"
      class="btn btn-primary"
      type="button"
      :disabled="isLoading || isSaving"
      @click="openCreateForm"
      title="Thêm kho hàng mới"
    >
      <i class="mdi mdi-plus"></i>
      Thêm kho
    </button>
  </PageHeader>

  <div v-if="!canManage" class="warehouse-readonly card card-pad">
    <i class="mdi mdi-eye-outline"></i>
    <span>Bạn đang xem ở chế độ chỉ xem.</span>
  </div>

  <SearchFilterBar v-model="searchDraft" placeholder="Tìm theo mã hoặc tên kho" @keyup.enter="applySearch">
    <select v-model="filters.status" class="select" :disabled="isLoading" @change="applyFilter">
      <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <button class="btn btn-primary" type="button" :disabled="isLoading" @click="applySearch">
      <i class="mdi mdi-magnify"></i>
      Tìm kiếm
    </button>
    <button v-if="hasActiveFilters" class="btn btn-ghost" type="button" :disabled="isLoading" @click="clearFilters">
      <i class="mdi mdi-filter-remove-outline"></i>
      Xóa lọc
    </button>
  </SearchFilterBar>

  <div v-if="successMessage" class="warehouse-success card card-pad">
    <i class="mdi mdi-check-circle-outline"></i>
    <span>{{ successMessage }}</span>
  </div>

  <div v-if="errorMessage" class="warehouse-alert card card-pad">
    <i class="mdi mdi-alert-circle-outline"></i>
    <span>{{ errorMessage }}</span>
  </div>

  <div class="warehouse-table-shell">
    <div v-if="isLoading" class="warehouse-loading card card-pad">
      <i class="mdi mdi-loading mdi-spin"></i>
      <span>Đang tải danh sách kho hàng...</span>
    </div>

    <DataTable v-else-if="warehouses.length > 0" :columns="columns" :rows="warehouses" min-width="900px">
      <template #diaChi="{ value }">{{ value || '-' }}</template>
      <template #trangThai="{ value }"><StatusBadge :status="displayStatus(value)" /></template>
      <template v-if="canManage" #actions="{ row }">
        <div class="actions">
          <button
            class="btn btn-sm btn-primary"
            type="button"
            :disabled="isLoading || isSaving"
            @click="openEditForm(row)"
            title="Chỉnh sửa thông tin kho hàng"
          >
            <i class="mdi mdi-pencil-outline"></i>
            Sửa
          </button>
          <button
            class="btn btn-sm"
            type="button"
            :disabled="isLoading || isSaving || togglingId"
            title="Ngừng hoạt động hoặc kích hoạt kho hàng"
            @click="requestStatus(row)"
          >
            <i class="mdi" :class="row.trangThai === 'HOAT_DONG' ? 'mdi-block-helper' : 'mdi-check-circle-outline'"></i>
            {{ row.trangThai === 'HOAT_DONG' ? 'Ngừng' : 'Kích hoạt' }}
          </button>
        </div>
      </template>
    </DataTable>

    <EmptyState
      v-else-if="!isLoading && !errorMessage"
      title="Không có kho hàng"
      description="Thử thay đổi bộ lọc hoặc thêm kho mới."
    />
  </div>

  <div v-if="isFormOpen" class="modal-backdrop">
    <div class="modal warehouse-modal">
      <form class="warehouse-form" @submit.prevent="submitWarehouseForm">
        <div class="modal-head between">
          <div>
            <h2 class="section-title">{{ formTitle }}</h2>
            <p class="modal-desc">{{ isEditMode ? 'Cập nhật thông tin kho hàng.' : 'Tạo kho hàng mới trong hệ thống.' }}</p>
          </div>
          <button class="btn btn-icon" type="button" :disabled="isSaving" aria-label="Đóng" @click="closeForm">
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="modal-body grid grid-2">
          <div v-if="saveErrorMessage" class="warehouse-form-alert">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>{{ saveErrorMessage }}</span>
          </div>

          <label class="field">
            <span>Mã kho *</span>
            <input v-model="form.maKho" class="input" type="text" placeholder="Nhập mã kho (VD: KHO_A)" :disabled="isSaving || isEditMode" />
            <small v-if="isEditMode" class="field-note">Không thể thay đổi mã kho hàng khi đã tạo để tránh lỗi dữ liệu chứng từ.</small>
            <small v-if="formErrors.maKho" class="field-error">{{ formErrors.maKho }}</small>
          </label>

          <label class="field">
            <span>Tên kho *</span>
            <input v-model="form.tenKho" class="input" type="text" placeholder="Nhập tên kho hàng" :disabled="isSaving" />
            <small v-if="formErrors.tenKho" class="field-error">{{ formErrors.tenKho }}</small>
          </label>

          <label class="field">
            <span>Địa chỉ</span>
            <input v-model="form.diaChi" class="input" type="text" placeholder="Nhập địa chỉ kho hàng" :disabled="isSaving" />
            <small v-if="formErrors.diaChi" class="field-error">{{ formErrors.diaChi }}</small>
          </label>

          <label class="field">
            <span>Trạng thái *</span>
            <select v-model="form.trangThai" class="select" :disabled="isSaving">
              <option v-for="option in warehouseStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small v-if="formErrors.trangThai" class="field-error">{{ formErrors.trangThai }}</small>
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

  <ConfirmDialog
    :open="!!pendingWarehouse"
    :title="confirmTitle"
    :message="confirmMessage"
    :danger="pendingWarehouse?.trangThai === 'HOAT_DONG'"
    :loading="!!togglingId"
    :confirm-text="pendingWarehouse?.trangThai === 'HOAT_DONG' ? 'Ngừng hoạt động' : 'Kích hoạt'"
    @cancel="pendingWarehouse = null"
    @confirm="confirmStatus"
  />
</template>

<style scoped>
.warehouse-alert, .warehouse-success { margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.warehouse-alert { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
.warehouse-success { color: #166534; background: #f0fdf4; border-color: #bbf7d0; }
.warehouse-readonly { margin-bottom: 16px; display: flex; align-items: center; gap: 10px; color: #075985; background: #f0f9ff; border-color: #bae6fd; }
.warehouse-table-shell { position: relative; }
.warehouse-loading { min-height: 220px; display: grid; place-items: center; align-content: center; gap: 10px; color: var(--muted); font-weight: 700; }
.mdi-spin { animation: spin 0.8s linear infinite; }
.btn:disabled, .select:disabled, .input:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.warehouse-modal { width: min(760px, 100%); }
.warehouse-form { margin: 0; }
.modal-desc { margin: 4px 0 0; color: var(--muted); }
.warehouse-form-alert { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; font-weight: 600; }
.field > span { color: #374151; font-weight: 600; }
.field-note { color: var(--muted); font-size: 12px; margin-top: 2px; }
.field-error { color: var(--danger); font-weight: 600; line-height: 18px; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 720px) {
  .actions { flex-direction: column; align-items: stretch; }
  .actions .btn { width: 100%; }
  .modal-foot { flex-direction: column-reverse; }
  .modal-foot .btn { width: 100%; }
}
</style>
