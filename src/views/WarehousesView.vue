<script setup>
/**
 * Màn hình danh sách kho hàng (T44 & T45).
 *
 * Nghiệp vụ và Thiết kế:
 * 1. Không xóa vật lý kho để bảo toàn dữ liệu lịch sử nhập/xuất/tồn kho. Thay vào đó, dùng trạng thái HOAT_DONG/NGUNG_HOAT_DONG.
 * 2. Mã kho là duy nhất để định danh và không được cho phép chỉnh sửa nhằm bảo vệ tính toàn vẹn của dữ liệu liên quan.
 * 3. Phân quyền thao tác:
 *    - Admin/IT và Quản lý kho có quyền thực hiện các thao tác quản trị (Thêm/Sửa/Ngừng hoạt động).
 *    - Nhân viên thủ kho chỉ có quyền xem danh sách.
 */

import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useInventoryStore } from '../data/useInventoryStore'
import { getWarehouses, createWarehouse, updateWarehouse } from '../services/warehouseService'
import { getWarehouseStatusLabel, warehouseStatusOptions } from '../constants/warehouseOptions'

const router = useRouter()
const store = useInventoryStore()

const warehouses = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const isFormOpen = ref(false)
const formMode = ref('create') // 'create' | 'edit'

const errorMessage = ref('')
const successMessage = ref('')
const saveErrorMessage = ref('')

// Phân quyền thao tác quản trị: Admin / IT và Quản lý kho được phép thực hiện
const canManage = computed(() => store.isAdmin || store.isManager)
const isEditMode = computed(() => formMode.value === 'edit')
const formTitle = computed(() => isEditMode.value ? 'Sửa kho hàng' : 'Thêm kho hàng')

const columns = [
  { key: 'maKho', label: 'Mã kho' },
  { key: 'tenKho', label: 'Tên kho' },
  { key: 'diaChi', label: 'Địa chỉ' },
  { key: 'trangThai', label: 'Trạng thái' },
  { key: 'actions', label: 'Thao tác' },
]

const form = reactive(createEmptyForm())
const formErrors = reactive({
  maKho: '',
  tenKho: '',
  diaChi: '',
  trangThai: '',
})

onMounted(() => {
  fetchWarehouses()
})

async function fetchWarehouses() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const data = await getWarehouses()
    warehouses.value = data || []
  } catch (error) {
    warehouses.value = []
    errorMessage.value = error.message
    if (error.status === 401) {
      router.replace('/login')
    }
  } finally {
    isLoading.value = false
  }
}

function createEmptyForm() {
  return {
    id: '',
    maKho: '',
    tenKho: '',
    diaChi: '',
    trangThai: 'HOAT_DONG',
  }
}

function openCreateForm() {
  formMode.value = 'create'
  Object.assign(form, createEmptyForm())
  successMessage.value = ''
  clearFormFeedback()
  isFormOpen.value = true
}

function openEditForm(warehouse) {
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
  if (!validateForm()) return

  isSaving.value = true
  saveErrorMessage.value = ''

  try {
    if (isEditMode.value) {
      // Khi sửa, payload chỉ bao gồm tenKho, diaChi, trangThai theo cấu trúc UpdateWarehouseRequest của backend (maKho không đổi)
      const payload = {
        tenKho: form.tenKho.trim(),
        diaChi: form.diaChi ? form.diaChi.trim() : null,
        trangThai: form.trangThai,
      }
      await updateWarehouse(form.id, payload)
      successMessage.value = 'Cập nhật kho hàng thành công.'
    } else {
      // Khi thêm mới, payload bao gồm maKho, tenKho, diaChi, trangThai theo cấu trúc CreateWarehouseRequest của backend
      const payload = {
        maKho: form.maKho.trim(),
        tenKho: form.tenKho.trim(),
        diaChi: form.diaChi ? form.diaChi.trim() : null,
        trangThai: form.trangThai,
      }
      await createWarehouse(payload)
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

function displayStatus(status) {
  return getWarehouseStatusLabel(status)
}
</script>

<template>
  <PageHeader title="Kho hàng" description="Quản lý danh sách kho ở mức cơ bản, chưa dùng sơ đồ kệ/vị trí.">
    <!-- Nút Thêm kho chỉ khả dụng với Admin/IT hoặc Quản lý kho -->
    <button 
      class="btn btn-primary" 
      type="button" 
      :disabled="!canManage || isLoading || isSaving"
      @click="openCreateForm"
      title="Thêm kho hàng mới (Yêu cầu quyền Quản lý kho hoặc Admin)"
    >
      <i class="mdi mdi-plus"></i>
      Thêm kho
    </button>
  </PageHeader>

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

    <DataTable 
      v-else 
      :columns="columns" 
      :rows="warehouses" 
      empty-text="Không tìm thấy kho hàng nào phù hợp"
    >
      <template #diaChi="{ value }">
        {{ value || '-' }}
      </template>

      <template #trangThai="{ value }">
        <StatusBadge :status="displayStatus(value)" />
      </template>

      <template #actions="{ row }">
        <div class="actions">
          <!-- Các nút thao tác chỉ khả dụng với Admin/IT hoặc Quản lý kho -->
          <button 
            class="btn btn-sm btn-primary" 
            type="button" 
            :disabled="!canManage || isLoading || isSaving"
            @click="openEditForm(row)"
            title="Chỉnh sửa thông tin kho hàng (Yêu cầu quyền Quản lý kho hoặc Admin)"
          >
            Sửa
          </button>
          <button 
            class="btn btn-sm" 
            type="button" 
            :disabled="!canManage || isLoading || isSaving"
            title="Ngừng hoạt động hoặc Kích hoạt kho hàng (Yêu cầu quyền Quản lý kho hoặc Admin)"
          >
            Ngừng hoạt động
          </button>
        </div>
      </template>
    </DataTable>
  </div>

  <!-- Form Modal Thêm/Sửa Kho Hàng -->
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
            <!-- Ghi chú nghiệp vụ: mã kho bị khóa khi sửa để đồng bộ rule backend không cho đổi mã kho -->
            <input 
              v-model="form.maKho" 
              class="input" 
              type="text" 
              placeholder="Nhập mã kho (VD: KHO_A)" 
              :disabled="isSaving || isEditMode" 
            />
            <small v-if="isEditMode" class="field-note">Không thể thay đổi mã kho hàng khi đã tạo để tránh lỗi dữ liệu chứng từ.</small>
            <small v-if="formErrors.maKho" class="field-error">{{ formErrors.maKho }}</small>
          </label>

          <label class="field">
            <span>Tên kho *</span>
            <input 
              v-model="form.tenKho" 
              class="input" 
              type="text" 
              placeholder="Nhập tên kho hàng" 
              :disabled="isSaving" 
            />
            <small v-if="formErrors.tenKho" class="field-error">{{ formErrors.tenKho }}</small>
          </label>

          <label class="field">
            <span>Địa chỉ</span>
            <input 
              v-model="form.diaChi" 
              class="input" 
              type="text" 
              placeholder="Nhập địa chỉ kho hàng" 
              :disabled="isSaving" 
            />
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
</template>

<style scoped>
.warehouse-alert, .warehouse-success {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.warehouse-alert {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
}

.warehouse-success {
  color: #166534;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.warehouse-table-shell {
  position: relative;
}

.warehouse-loading {
  min-height: 220px;
  display: grid;
  place-items: center;
  gap: 10px;
  color: var(--muted);
  font-weight: 700;
}

.mdi-spin {
  animation: spin 0.8s linear infinite;
}

.btn:disabled, .select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.warehouse-modal {
  width: min(760px, 100%);
}

.warehouse-form {
  margin: 0;
}

.modal-desc {
  margin: 4px 0 0;
  color: var(--muted);
}

.warehouse-form-alert {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 12px;
  font-weight: 600;
}

.field > span {
  color: #374151;
  font-weight: 600;
}

.field-note {
  color: var(--muted);
  font-size: 12px;
  margin-top: 2px;
}

.field-error {
  color: var(--danger);
  font-weight: 600;
  line-height: 18px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .actions {
    flex-direction: column;
    align-items: stretch;
  }
  .actions .btn {
    width: 100%;
  }
  .modal-foot {
    flex-direction: column-reverse;
  }
  .modal-foot .btn {
    width: 100%;
  }
}
</style>
