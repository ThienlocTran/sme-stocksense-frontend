<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '../../components/DataTable.vue'
import PageHeader from '../../components/PageHeader.vue'
import SearchFilterBar from '../../components/SearchFilterBar.vue'
import { categoryStatusOptions, getCategoryStatusLabel } from '../../constants/categoryOptions'
import { createCategory, getCategories, updateCategory } from '../../services/categoryService'

const router = useRouter()
const categories = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const isFormOpen = ref(false)
const formMode = ref('create')
const errorMessage = ref('')
const successMessage = ref('')
const saveErrorMessage = ref('')
const searchDraft = ref('')
const filters = reactive({ keyword: '', status: '', page: 0, size: 10 })
const pageInfo = reactive({ totalElements: 0, totalPages: 0 })
const form = reactive(createEmptyForm())
const formErrors = reactive({ code: '', name: '', description: '', status: '' })

const columns = [
  { key: 'code', label: 'Mã danh mục' },
  { key: 'name', label: 'Tên danh mục' },
  { key: 'description', label: 'Mô tả' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'actions', label: 'Thao tác' },
]

const statusOptions = [{ value: '', label: 'Tất cả trạng thái' }, ...categoryStatusOptions]
const currentPage = computed(() => filters.page + 1)
const canGoPrevious = computed(() => filters.page > 0 && !isLoading.value)
const canGoNext = computed(() => filters.page + 1 < pageInfo.totalPages && !isLoading.value)
const isEditMode = computed(() => formMode.value === 'edit')
const formTitle = computed(() => (isEditMode.value ? 'Sửa danh mục' : 'Thêm danh mục'))
const rangeText = computed(() => {
  if (pageInfo.totalElements === 0) return '0 danh mục'
  const start = filters.page * filters.size + 1
  const end = Math.min((filters.page + 1) * filters.size, pageInfo.totalElements)
  return `${start}-${end} / ${pageInfo.totalElements} danh mục`
})

onMounted(() => {
  fetchCategories()
})

async function fetchCategories() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const data = await getCategories(filters)
    categories.value = data.content || []
    filters.page = data.page || 0
    filters.size = data.size || filters.size
    pageInfo.totalElements = data.totalElements || 0
    pageInfo.totalPages = data.totalPages || 0
  } catch (error) {
    categories.value = []
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
  fetchCategories()
}

function applyFilter() {
  filters.page = 0
  fetchCategories()
}

function goPrevious() {
  if (!canGoPrevious.value) return
  filters.page -= 1
  fetchCategories()
}

function goNext() {
  if (!canGoNext.value) return
  filters.page += 1
  fetchCategories()
}

function createEmptyForm() {
  return {
    id: '',
    code: '',
    name: '',
    description: '',
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

function openEditForm(category) {
  formMode.value = 'edit'
  Object.assign(form, {
    id: category.id,
    code: category.code || '',
    name: category.name || '',
    description: category.description || '',
    status: category.status || 'HOAT_DONG',
  })
  successMessage.value = ''
  clearFormFeedback()
  isFormOpen.value = true
}

function closeForm() {
  if (isSaving.value) return
  isFormOpen.value = false
}

async function submitCategoryForm() {
  if (!validateForm()) return

  isSaving.value = true
  saveErrorMessage.value = ''

  const payload = {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    status: form.status,
  }

  try {
    if (isEditMode.value) {
      await updateCategory(form.id, payload)
      successMessage.value = 'Cập nhật danh mục thành công.'
    } else {
      await createCategory(payload)
      successMessage.value = 'Thêm danh mục thành công.'
    }

    isFormOpen.value = false
    await fetchCategories()
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

  if (!form.code.trim()) {
    formErrors.code = 'Vui lòng nhập mã danh mục.'
    isValid = false
  }

  if (!form.name.trim()) {
    formErrors.name = 'Vui lòng nhập tên danh mục.'
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

function statusClass(status) {
  return {
    'category-status-active': status === 'HOAT_DONG',
    'category-status-inactive': status === 'NGUNG_HOAT_DONG',
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
  <PageHeader title="Danh mục" description="Danh sách nhóm sản phẩm theo mã, tên và trạng thái.">
    <button class="btn btn-primary" type="button" :disabled="isLoading || isSaving" @click="openCreateForm">
      <i class="mdi mdi-shape-plus-outline"></i>
      Thêm danh mục
    </button>
  </PageHeader>

  <SearchFilterBar v-model="searchDraft" placeholder="Tìm theo mã hoặc tên danh mục">
    <button class="btn btn-primary" type="button" :disabled="isLoading" @click="applySearch">
      <i class="mdi mdi-magnify"></i>
      Tìm kiếm
    </button>
    <select v-model="filters.status" class="select" :disabled="isLoading" @change="applyFilter">
      <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
  </SearchFilterBar>

  <div v-if="successMessage" class="category-success card card-pad">
    <i class="mdi mdi-check-circle-outline"></i>
    <span>{{ successMessage }}</span>
  </div>

  <div v-if="errorMessage" class="category-alert card card-pad">
    <i class="mdi mdi-alert-circle-outline"></i>
    <span>{{ errorMessage }}</span>
  </div>

  <div class="category-table-shell">
    <div v-if="isLoading" class="category-loading card card-pad">
      <i class="mdi mdi-loading mdi-spin"></i>
      Đang tải danh sách danh mục
    </div>

    <DataTable v-else :columns="columns" :rows="categories" empty-text="Không có danh mục phù hợp">
      <template #description="{ value }">{{ value || '-' }}</template>
      <template #status="{ value }">
        <span class="category-status" :class="statusClass(value)">{{ getCategoryStatusLabel(value) }}</span>
      </template>
      <template #createdAt="{ value }">{{ formatDate(value) }}</template>
      <template #actions="{ row }">
        <div class="actions">
          <button class="btn btn-sm btn-primary" type="button" :disabled="isLoading || isSaving" @click="openEditForm(row)">Sửa</button>
          <button class="btn btn-sm" type="button" disabled>Ngừng hoạt động</button>
        </div>
      </template>
    </DataTable>
  </div>

  <div class="category-pagination card card-pad">
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
    <div class="modal category-modal">
      <form class="category-form" @submit.prevent="submitCategoryForm">
        <div class="modal-head between">
          <div>
            <h2 class="section-title">{{ formTitle }}</h2>
            <p class="modal-desc">{{ isEditMode ? 'Cập nhật thông tin danh mục.' : 'Tạo danh mục mới cho nhóm sản phẩm.' }}</p>
          </div>
          <button class="btn btn-icon" type="button" :disabled="isSaving" aria-label="Đóng" @click="closeForm">
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="modal-body grid grid-2">
          <div v-if="saveErrorMessage" class="category-form-alert">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>{{ saveErrorMessage }}</span>
          </div>

          <label class="field">
            <span>Mã danh mục</span>
            <input v-model="form.code" class="input" type="text" placeholder="Nhập mã danh mục" :disabled="isSaving" />
            <small v-if="formErrors.code" class="field-error">{{ formErrors.code }}</small>
          </label>

          <label class="field">
            <span>Tên danh mục</span>
            <input v-model="form.name" class="input" type="text" placeholder="Nhập tên danh mục" :disabled="isSaving" />
            <small v-if="formErrors.name" class="field-error">{{ formErrors.name }}</small>
          </label>

          <label class="field field-wide">
            <span>Mô tả</span>
            <textarea v-model="form.description" class="input textarea" rows="3" placeholder="Nhập mô tả" :disabled="isSaving"></textarea>
            <small v-if="formErrors.description" class="field-error">{{ formErrors.description }}</small>
          </label>

          <label class="field">
            <span>Trạng thái</span>
            <select v-model="form.status" class="select" :disabled="isSaving">
              <option v-for="option in categoryStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
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
.category-alert, .category-success { margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.category-alert { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
.category-success { color: #166534; background: #f0fdf4; border-color: #bbf7d0; }
.category-table-shell { position: relative; }
.category-loading { min-height: 220px; display: grid; place-items: center; gap: 10px; color: var(--muted); font-weight: 700; }
.mdi-spin { animation: spin 0.8s linear infinite; }
.category-status { display: inline-flex; align-items: center; min-height: 26px; border-radius: 999px; padding: 4px 9px; font-size: 12px; font-weight: 800; white-space: nowrap; background: #e2e8f0; color: #334155; }
.category-status-active { background: #dcfce7; color: #15803d; }
.category-status-inactive { background: #e2e8f0; color: #334155; }
.category-pagination { margin-top: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.pagination-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.page-size { width: 130px; min-height: 34px; }
.page-indicator { min-width: 112px; text-align: center; color: var(--muted); font-weight: 700; }
.category-modal { width: min(760px, 100%); }
.category-form { margin: 0; }
.modal-desc { margin: 4px 0 0; color: var(--muted); }
.category-form-alert { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; font-weight: 600; }
.field > span { color: #374151; font-weight: 600; }
.field-wide { grid-column: 1 / -1; }
.textarea { resize: vertical; min-height: 86px; }
.field-error { color: var(--danger); font-weight: 600; line-height: 18px; }
.btn:disabled, .select:disabled, .input:disabled { opacity: 0.6; cursor: not-allowed; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .category-pagination, .pagination-actions { align-items: stretch; flex-direction: column; width: 100%; }
  .page-size, .pagination-actions .btn, .page-indicator { width: 100%; }
  .field-wide { grid-column: auto; }
  .modal-foot { flex-direction: column-reverse; }
  .modal-foot .btn { width: 100%; }
}
</style>
