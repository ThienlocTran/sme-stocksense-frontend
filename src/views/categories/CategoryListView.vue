<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import DataTable from '../../components/DataTable.vue'
import PageHeader from '../../components/PageHeader.vue'
import SearchFilterBar from '../../components/SearchFilterBar.vue'
import { categoryStatusOptions, getCategoryStatusLabel } from '../../constants/categoryOptions'
import { createCategory, disableCategory, getCategories, updateCategory } from '../../services/categoryService'
import { canManageCategories } from '../../services/permissionService'

const router = useRouter()
const { t } = useI18n()
const categories = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const disablingId = ref(null)
const pendingCategory = ref(null)
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

const canManage = computed(() => canManageCategories())
const columns = computed(() => {
  const baseColumns = [
  { key: 'code', label: t('category.code'), class: 'cell-compact' },
  { key: 'name', label: t('category.name') },
  { key: 'description', label: t('category.description') },
  { key: 'status', label: t('category.status'), class: 'cell-nowrap' },
  { key: 'createdAt', label: t('category.createdAt'), class: 'cell-nowrap' },
  ]
  return canManage.value
    ? [...baseColumns, { key: 'actions', label: t('category.actions'), class: 'cell-nowrap' }]
    : baseColumns
})

const statusOptions = [{ value: '', label: t('category.allStatuses') }, ...categoryStatusOptions]
const currentPage = computed(() => filters.page + 1)
const canGoPrevious = computed(() => filters.page > 0 && !isLoading.value)
const canGoNext = computed(() => filters.page + 1 < pageInfo.totalPages && !isLoading.value)
const isEditMode = computed(() => formMode.value === 'edit')
const formTitle = computed(() => (isEditMode.value ? t('category.editCategory') : t('category.addCategory')))
const hasActiveFilters = computed(() => searchDraft.value.trim() !== '' || filters.status !== '')
const confirmTitle = computed(() => pendingCategory.value?.status === 'NGUNG_HOAT_DONG' ? t('category.activateConfirmTitle') : t('category.deactivateConfirmTitle'))
const confirmMessage = computed(() => pendingCategory.value
  ? t('category.confirmToggleMsg', { action: getStatusToggleLabel(pendingCategory.value).toLowerCase(), name: pendingCategory.value.name })
  : '')
const rangeText = computed(() => {
  if (pageInfo.totalElements === 0) return t('category.zeroCategories')
  const start = filters.page * filters.size + 1
  const end = Math.min((filters.page + 1) * filters.size, pageInfo.totalElements)
  return t('category.categoriesRange', { start, end, total: pageInfo.totalElements })
})

onMounted(fetchCategories)

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

const searchDebounceTimer = ref(null)
watch(searchDraft, (newVal) => {
  if (searchDebounceTimer.value) clearTimeout(searchDebounceTimer.value)
  searchDebounceTimer.value = setTimeout(() => {
    filters.keyword = newVal.trim()
    filters.page = 0
    fetchCategories()
  }, 300)
})

function applyFilter() {
  filters.page = 0
  fetchCategories()
}

function clearFilters() {
  searchDraft.value = ''
  filters.keyword = ''
  filters.status = ''
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

function getStatusToggleLabel(category) {
  return category.status === 'NGUNG_HOAT_DONG' ? t('category.activate') : t('category.deactivate')
}

function requestCategoryStatus(category) {
  if (!canManage.value || !category?.id || disablingId.value) return
  pendingCategory.value = category
}

async function confirmCategoryStatus() {
  const category = pendingCategory.value
  if (!canManage.value || !category?.id || disablingId.value) return

  const nextStatus = category.status === 'NGUNG_HOAT_DONG' ? 'HOAT_DONG' : 'NGUNG_HOAT_DONG'
  disablingId.value = category.id
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (nextStatus === 'NGUNG_HOAT_DONG') {
      await disableCategory(category.id)
    } else {
      await updateCategory(category.id, {
        code: category.code,
        name: category.name,
        description: category.description || null,
        status: nextStatus,
      })
    }
    successMessage.value = nextStatus === 'NGUNG_HOAT_DONG'
      ? t('category.successDeactivate')
      : t('category.successActivate')
    pendingCategory.value = null
    await fetchCategories()
  } catch (error) {
    if (error.status === 401) {
      router.replace('/login')
      return
    }
    errorMessage.value = error.message
  } finally {
    disablingId.value = null
  }
}

function createEmptyForm() {
  return { id: '', code: '', name: '', description: '', status: 'HOAT_DONG' }
}

function openCreateForm() {
  if (!canManage.value) return
  formMode.value = 'create'
  Object.assign(form, createEmptyForm())
  successMessage.value = ''
  clearFormFeedback()
  isFormOpen.value = true
}

function openEditForm(category) {
  if (!canManage.value) return
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
  if (!canManage.value) return
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
      successMessage.value = t('category.successUpdate')
    } else {
      await createCategory(payload)
      successMessage.value = t('category.successAdd')
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
    formErrors.code = t('category.errCodeEmpty')
    isValid = false
  }
  if (!form.name.trim()) {
    formErrors.name = t('category.errNameEmpty')
    isValid = false
  }
  if (!form.status) {
    formErrors.status = t('category.errStatusEmpty')
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
  <PageHeader :title="t('category.pageTitle')" :description="t('category.pageDesc')">
    <button v-if="canManage" class="btn btn-primary" type="button" :disabled="isLoading || isSaving" @click="openCreateForm">
      <i class="mdi mdi-shape-plus-outline"></i>
      {{ t('category.btnAddCategory') }}
    </button>
  </PageHeader>

  <div v-if="!canManage" class="category-readonly card card-pad">
    <i class="mdi mdi-eye-outline"></i>
    <span>{{ t('category.readonlyNote') }}</span>
  </div>

  <SearchFilterBar v-model="searchDraft" :placeholder="t('category.searchPlaceholder')" @keyup.enter="applySearch">
    <select v-model="filters.status" class="select" :disabled="isLoading" @change="applyFilter">
      <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <button class="btn btn-primary" type="button" :disabled="isLoading" @click="applySearch">
      <i class="mdi mdi-magnify"></i>
      {{ t('category.btnSearch') }}
    </button>
    <button v-if="hasActiveFilters" class="btn btn-ghost" type="button" :disabled="isLoading" @click="clearFilters">
      <i class="mdi mdi-filter-remove-outline"></i>
      {{ t('category.btnClearFilter') }}
    </button>
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
      <span>{{ t('category.loadingText') }}</span>
    </div>

    <DataTable v-else :columns="columns" :rows="categories" min-width="980px" :empty-text="t('category.emptyTable')">
      <template #description="{ value }">{{ value || '-' }}</template>
      <template #status="{ value }">
        <span class="category-status" :class="statusClass(value)">{{ getCategoryStatusLabel(value) }}</span>
      </template>
      <template #createdAt="{ value }">{{ formatDate(value) }}</template>
      <template v-if="canManage" #actions="{ row }">
        <div class="actions">
          <button class="btn btn-sm btn-primary" type="button" :disabled="isLoading || isSaving" @click="openEditForm(row)">
            <i class="mdi mdi-pencil-outline"></i>
            {{ t('category.edit') }}
          </button>
          <button class="btn btn-sm" type="button" :disabled="isLoading || disablingId" @click="requestCategoryStatus(row)">
            <i class="mdi" :class="row.status === 'NGUNG_HOAT_DONG' ? 'mdi-check-circle-outline' : 'mdi-block-helper'"></i>
            {{ getStatusToggleLabel(row) }}
          </button>
        </div>
      </template>
    </DataTable>
  </div>

  <div class="category-pagination card card-pad">
    <span class="muted">{{ rangeText }}</span>
    <div class="pagination-actions">
      <select v-model.number="filters.size" class="select page-size" :disabled="isLoading" @change="applyFilter">
        <option :value="10">10 / {{ t('category.pageUnit') }}</option>
        <option :value="20">20 / {{ t('category.pageUnit') }}</option>
        <option :value="50">50 / {{ t('category.pageUnit') }}</option>
      </select>
      <button class="btn btn-sm" type="button" :disabled="!canGoPrevious" @click="goPrevious">
        <i class="mdi mdi-chevron-left"></i>
        {{ t('category.prev') }}
      </button>
      <span class="page-indicator">{{ t('category.page') }} {{ currentPage }} / {{ pageInfo.totalPages || 1 }}</span>
      <button class="btn btn-sm" type="button" :disabled="!canGoNext" @click="goNext">
        {{ t('category.next') }}
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
            <p class="modal-desc">{{ isEditMode ? t('category.modalDescEdit') : t('category.modalDescAdd') }}</p>
          </div>
          <button class="btn btn-icon" type="button" :disabled="isSaving" :aria-label="t('category.close')" @click="closeForm">
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="modal-body grid grid-2">
          <div v-if="saveErrorMessage" class="category-form-alert">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>{{ saveErrorMessage }}</span>
          </div>

          <label class="field">
            <span>{{ t('category.code') }}</span>
            <input v-model="form.code" class="input" type="text" :placeholder="t('category.placeholderCode')" :disabled="isSaving" />
            <small v-if="formErrors.code" class="field-error">{{ formErrors.code }}</small>
          </label>

          <label class="field">
            <span>{{ t('category.name') }}</span>
            <input v-model="form.name" class="input" type="text" :placeholder="t('category.placeholderName')" :disabled="isSaving" />
            <small v-if="formErrors.name" class="field-error">{{ formErrors.name }}</small>
          </label>

          <label class="field field-wide">
            <span>{{ t('category.description') }}</span>
            <textarea v-model="form.description" class="input textarea" rows="3" :placeholder="t('category.placeholderDesc')" :disabled="isSaving"></textarea>
            <small v-if="formErrors.description" class="field-error">{{ formErrors.description }}</small>
          </label>

          <label class="field">
            <span>{{ t('category.status') }}</span>
            <select v-model="form.status" class="select" :disabled="isSaving">
              <option v-for="option in categoryStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <small v-if="formErrors.status" class="field-error">{{ formErrors.status }}</small>
          </label>
        </div>

        <div class="modal-foot">
          <button class="btn" type="button" :disabled="isSaving" @click="closeForm">{{ t('category.cancel') }}</button>
          <button class="btn btn-primary" type="submit" :disabled="isSaving">
            <i v-if="isSaving" class="mdi mdi-loading mdi-spin"></i>
            {{ isSaving ? t('category.saving') : t('category.save') }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <ConfirmDialog
    :open="!!pendingCategory"
    :title="confirmTitle"
    :message="confirmMessage"
    :danger="pendingCategory?.status !== 'NGUNG_HOAT_DONG'"
    :loading="!!disablingId"
    :confirm-text="pendingCategory?.status === 'NGUNG_HOAT_DONG' ? t('category.activate') : t('category.deactivate')"
    @cancel="pendingCategory = null"
    @confirm="confirmCategoryStatus"
  />
</template>

<style scoped>
.category-alert, .category-success { margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.category-alert { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
.category-success { color: #166534; background: #f0fdf4; border-color: #bbf7d0; }
.category-readonly { margin-bottom: 16px; display: flex; align-items: center; gap: 10px; color: #075985; background: #f0f9ff; border-color: #bae6fd; }
.category-table-shell { position: relative; }
.category-loading { min-height: 220px; display: grid; place-items: center; align-content: center; gap: 10px; color: var(--muted); font-weight: 700; }
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
.btn:disabled, .select:disabled, .input:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

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
