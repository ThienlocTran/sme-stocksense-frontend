<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import DataTable from '../components/DataTable.vue'
import EmptyState from '../components/EmptyState.vue'
import PageHeader from '../components/PageHeader.vue'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { getCurrentRoleCode } from '../services/authService'
import {
  createProduct,
  getProduct,
  getProductCategories,
  getProducts,
  getProductSuppliers,
  updateProduct,
  updateProductStatus,
} from '../services/productService'

const router = useRouter()
const products = ref([])
const categories = ref([])
const suppliers = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const togglingId = ref(null)
const pendingProduct = ref(null)
const isFormOpen = ref(false)
const formMode = ref('create')
const errorMessage = ref('')
const successMessage = ref('')
const saveErrorMessage = ref('')
const searchDraft = ref('')

const page = ref(0)
const size = ref(10)
const totalPages = ref(0)
const totalElements = ref(0)
const filters = reactive({ keyword: '', categoryId: '', status: '' })

const canManage = computed(() => ['ADMIN', 'MANAGER'].includes(getCurrentRoleCode()))
const isEditMode = computed(() => formMode.value === 'edit')
const formTitle = computed(() => isEditMode.value ? 'Sửa sản phẩm' : 'Thêm sản phẩm')
const hasPreviousPage = computed(() => page.value > 0)
const hasNextPage = computed(() => page.value + 1 < totalPages.value)
const hasActiveFilters = computed(() => searchDraft.value.trim() !== '' || filters.categoryId !== '' || filters.status !== '')
const confirmTitle = computed(() => pendingProduct.value?.status === 'HOAT_DONG' ? 'Ngừng hoạt động sản phẩm?' : 'Kích hoạt sản phẩm?')
const confirmMessage = computed(() => pendingProduct.value
  ? `Bạn muốn ${pendingProduct.value.status === 'HOAT_DONG' ? 'ngừng hoạt động' : 'kích hoạt'} "${pendingProduct.value.name}"?`
  : '')

const columns = [
  { key: 'code', label: 'Mã SP', class: 'cell-compact' },
  { key: 'sku', label: 'SKU', class: 'cell-compact' },
  { key: 'name', label: 'Tên sản phẩm' },
  { key: 'categoryName', label: 'Danh mục' },
  { key: 'partnerName', label: 'Nhà cung cấp' },
  { key: 'unit', label: 'Đơn vị', class: 'cell-compact' },
  { key: 'minStock', label: 'Ngưỡng tối thiểu', class: 'cell-compact' },
  { key: 'price', label: 'Đơn giá', class: 'cell-nowrap' },
  { key: 'status', label: 'Trạng thái', class: 'cell-nowrap' },
  { key: 'actions', label: 'Thao tác', class: 'cell-nowrap' },
]

const form = reactive(emptyForm())
const formErrors = reactive({
  code: '', name: '', sku: '', barcode: '', unit: '', price: '', minStock: '', categoryId: '', partnerId: '', status: '',
})

onMounted(async () => {
  await Promise.all([loadDropdowns(), fetchProducts()])
})

async function loadDropdowns() {
  try {
    const [categoryData, supplierData] = await Promise.all([getProductCategories(), getProductSuppliers()])
    categories.value = categoryData || []
    suppliers.value = supplierData || []
  } catch (error) {
    errorMessage.value = error.message
    if (error.status === 401) router.replace('/login')
  }
}

async function fetchProducts() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const data = await getProducts({
      page: page.value,
      size: size.value,
      keyword: filters.keyword,
      categoryId: filters.categoryId,
      status: filters.status,
    })
    products.value = data.content || []
    totalPages.value = data.totalPages || 0
    totalElements.value = data.totalElements || 0
  } catch (error) {
    products.value = []
    errorMessage.value = error.message
    if (error.status === 401) router.replace('/login')
  } finally {
    isLoading.value = false
  }
}

function applySearch() {
  filters.keyword = searchDraft.value.trim()
  page.value = 0
  fetchProducts()
}

function applyFilter() {
  page.value = 0
  fetchProducts()
}

function clearFilters() {
  searchDraft.value = ''
  filters.keyword = ''
  filters.categoryId = ''
  filters.status = ''
  page.value = 0
  fetchProducts()
}

function previousPage() {
  if (!hasPreviousPage.value) return
  page.value -= 1
  fetchProducts()
}

function nextPage() {
  if (!hasNextPage.value) return
  page.value += 1
  fetchProducts()
}

function emptyForm() {
  return { id: '', code: '', name: '', sku: '', barcode: '', unit: '', price: '', minStock: 0, categoryId: '', partnerId: '', status: 'HOAT_DONG' }
}

function openCreateForm() {
  formMode.value = 'create'
  Object.assign(form, emptyForm())
  successMessage.value = ''
  clearFormFeedback()
  isFormOpen.value = true
}

async function openEditForm(product) {
  formMode.value = 'edit'
  successMessage.value = ''
  clearFormFeedback()
  isFormOpen.value = true
  try {
    const detail = await getProduct(product.id)
    Object.assign(form, {
      id: detail.id,
      code: detail.code || '',
      name: detail.name || '',
      sku: detail.sku || '',
      barcode: detail.barcode || '',
      unit: detail.unit || '',
      price: detail.price ?? '',
      minStock: detail.minStock ?? 0,
      categoryId: detail.categoryId || '',
      partnerId: detail.partnerId || '',
      status: detail.status || 'HOAT_DONG',
    })
  } catch (error) {
    isFormOpen.value = false
    errorMessage.value = error.message
  }
}

function closeForm() {
  if (!isSaving.value) isFormOpen.value = false
}

function clearFormFeedback() {
  saveErrorMessage.value = ''
  Object.keys(formErrors).forEach(key => { formErrors[key] = '' })
}

function applyBackendErrors(errors = {}) {
  Object.keys(formErrors).forEach(key => { formErrors[key] = errors?.[key] || '' })
}

function validateForm() {
  clearFormFeedback()
  let valid = true
  if (!form.code.trim()) { formErrors.code = 'Mã sản phẩm không được để trống.'; valid = false }
  if (!form.name.trim()) { formErrors.name = 'Tên sản phẩm không được để trống.'; valid = false }
  if (!form.unit.trim()) { formErrors.unit = 'Đơn vị tính không được để trống.'; valid = false }
  if (form.price === '' || Number(form.price) < 0) { formErrors.price = 'Đơn giá phải lớn hơn hoặc bằng 0.'; valid = false }
  if (form.minStock !== '' && Number(form.minStock) < 0) { formErrors.minStock = 'Ngưỡng tồn phải lớn hơn hoặc bằng 0.'; valid = false }
  if (isEditMode.value && !form.status) { formErrors.status = 'Trạng thái không được để trống.'; valid = false }
  return valid
}

function toPayload() {
  const payload = {
    code: form.code.trim(),
    name: form.name.trim(),
    sku: form.sku.trim() || null,
    barcode: form.barcode.trim() || null,
    unit: form.unit.trim(),
    price: Number(form.price),
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    partnerId: form.partnerId ? Number(form.partnerId) : null,
    minStock: form.minStock === '' ? null : Number(form.minStock),
  }
  if (isEditMode.value) payload.status = form.status
  return payload
}

async function submitForm() {
  if (!validateForm()) return
  isSaving.value = true
  try {
    if (isEditMode.value) {
      await updateProduct(form.id, toPayload())
      successMessage.value = 'Cập nhật sản phẩm thành công.'
    } else {
      await createProduct(toPayload())
      successMessage.value = 'Thêm sản phẩm thành công.'
    }
    isFormOpen.value = false
    await fetchProducts()
  } catch (error) {
    saveErrorMessage.value = error.message
    applyBackendErrors(error.errors)
    if (error.status === 401) router.replace('/login')
  } finally {
    isSaving.value = false
  }
}

function requestStatus(product) {
  if (!canManage.value || togglingId.value) return
  pendingProduct.value = product
}

async function confirmStatus() {
  const product = pendingProduct.value
  if (!product || !canManage.value) return

  const nextStatus = product.status === 'HOAT_DONG' ? 'NGUNG_HOAT_DONG' : 'HOAT_DONG'
  togglingId.value = product.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await updateProductStatus(product.id, nextStatus)
    successMessage.value = nextStatus === 'HOAT_DONG' ? 'Đã kích hoạt sản phẩm.' : 'Đã ngừng hoạt động sản phẩm.'
    pendingProduct.value = null
    await fetchProducts()
  } catch (error) {
    errorMessage.value = error.message
    if (error.status === 401) router.replace('/login')
  } finally {
    togglingId.value = null
  }
}

function displayStatus(status) {
  return status === 'HOAT_DONG' ? 'Đang hoạt động' : status === 'NGUNG_HOAT_DONG' ? 'Ngừng hoạt động' : status || '-'
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('vi-VN') + ' đ'
}
</script>

<template>
  <PageHeader title="Sản phẩm" description="Quản lý danh mục sản phẩm cơ bản cho tồn kho.">
    <button v-if="canManage" class="btn btn-primary" type="button" :disabled="isLoading || isSaving" @click="openCreateForm">
      <i class="mdi mdi-plus"></i>
      Thêm sản phẩm
    </button>
  </PageHeader>

  <SearchFilterBar v-model="searchDraft" placeholder="Tìm theo mã, SKU hoặc tên sản phẩm" @keyup.enter="applySearch">
    <select v-model="filters.categoryId" class="select" :disabled="isLoading" @change="applyFilter">
      <option value="">Tất cả danh mục</option>
      <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
    </select>
    <select v-model="filters.status" class="select" :disabled="isLoading" @change="applyFilter">
      <option value="">Tất cả trạng thái</option>
      <option value="HOAT_DONG">Đang hoạt động</option>
      <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
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

  <p v-if="errorMessage" class="form-alert form-alert-error">{{ errorMessage }}</p>
  <p v-if="successMessage" class="form-alert form-alert-success">{{ successMessage }}</p>

  <div v-if="isLoading" class="loading-card card card-pad">
    <i class="mdi mdi-loading mdi-spin"></i>
    <span>Đang tải sản phẩm...</span>
  </div>

  <DataTable
    v-else-if="products.length > 0"
    :columns="columns"
    :rows="products"
    min-width="1180px"
    empty-text="Chưa có sản phẩm từ backend"
  >
    <template #price="{ value }">{{ formatCurrency(value) }}</template>
    <template #status="{ value }"><StatusBadge :status="displayStatus(value)" /></template>
    <template #actions="{ row }">
      <div class="actions">
        <button v-if="canManage" class="btn btn-sm btn-primary" type="button" :disabled="isLoading || isSaving" @click="openEditForm(row)">
          <i class="mdi mdi-pencil-outline"></i>
          Sửa
        </button>
        <button v-if="canManage" class="btn btn-sm" type="button" :disabled="isLoading || togglingId" @click="requestStatus(row)">
          <i class="mdi" :class="row.status === 'HOAT_DONG' ? 'mdi-block-helper' : 'mdi-check-circle-outline'"></i>
          {{ row.status === 'HOAT_DONG' ? 'Ngừng' : 'Kích hoạt' }}
        </button>
      </div>
    </template>
  </DataTable>

  <EmptyState
    v-else-if="!isLoading && !errorMessage"
    title="Không có sản phẩm"
    description="Thử thay đổi bộ lọc hoặc thêm sản phẩm mới."
  />

  <div class="pagination-bar card card-pad">
    <span class="muted">{{ totalElements }} sản phẩm</span>
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

  <div v-if="isFormOpen" class="modal-backdrop" @click.self="closeForm">
    <form class="modal card card-pad" @submit.prevent="submitForm">
      <div class="modal-head">
        <div>
          <h2>{{ formTitle }}</h2>
          <p class="modal-desc">Dữ liệu được lưu qua API backend.</p>
        </div>
        <button class="btn btn-icon" type="button" :disabled="isSaving" aria-label="Đóng" @click="closeForm"><i class="mdi mdi-close"></i></button>
      </div>

      <p v-if="saveErrorMessage" class="form-alert form-alert-error">{{ saveErrorMessage }}</p>

      <div class="form-grid">
        <label>Mã sản phẩm<input v-model="form.code" class="input" :disabled="isSaving" /><small class="field-error">{{ formErrors.code }}</small></label>
        <label>Tên sản phẩm<input v-model="form.name" class="input" :disabled="isSaving" /><small class="field-error">{{ formErrors.name }}</small></label>
        <label>SKU<input v-model="form.sku" class="input" :disabled="isSaving" /><small class="field-error">{{ formErrors.sku }}</small></label>
        <label>Mã vạch<input v-model="form.barcode" class="input" :disabled="isSaving" /><small class="field-error">{{ formErrors.barcode }}</small></label>
        <label>Đơn vị<input v-model="form.unit" class="input" :disabled="isSaving" /><small class="field-error">{{ formErrors.unit }}</small></label>
        <label>Đơn giá<input v-model="form.price" class="input" type="number" min="0" step="0.01" :disabled="isSaving" /><small class="field-error">{{ formErrors.price }}</small></label>
        <label>Ngưỡng tối thiểu<input v-model="form.minStock" class="input" type="number" min="0" :disabled="isSaving" /><small class="field-error">{{ formErrors.minStock }}</small></label>
        <label>Danh mục<select v-model="form.categoryId" class="select" :disabled="isSaving"><option value="">Không chọn</option><option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option></select><small class="field-error">{{ formErrors.categoryId }}</small></label>
        <label>Nhà cung cấp<select v-model="form.partnerId" class="select" :disabled="isSaving"><option value="">Không chọn</option><option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.tenDoiTac }}</option></select><small class="field-error">{{ formErrors.partnerId }}</small></label>
        <label v-if="isEditMode">Trạng thái<select v-model="form.status" class="select" :disabled="isSaving"><option value="HOAT_DONG">Đang hoạt động</option><option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option></select><small class="field-error">{{ formErrors.status }}</small></label>
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

  <ConfirmDialog
    :open="!!pendingProduct"
    :title="confirmTitle"
    :message="confirmMessage"
    :danger="pendingProduct?.status === 'HOAT_DONG'"
    :loading="!!togglingId"
    :confirm-text="pendingProduct?.status === 'HOAT_DONG' ? 'Ngừng hoạt động' : 'Kích hoạt'"
    @cancel="pendingProduct = null"
    @confirm="confirmStatus"
  />
</template>

<style scoped>
.loading-card { min-height: 220px; display: grid; place-items: center; align-content: center; gap: 10px; color: var(--muted); font-weight: 700; }
.form-alert { margin: 0 0 12px; padding: 10px 12px; border-radius: 8px; line-height: 20px; }
.form-alert-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.form-alert-success { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.pagination-bar { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pagination-actions { display: flex; align-items: center; gap: 10px; }
.page-indicator { color: var(--muted); font-weight: 600; white-space: nowrap; }
.modal { width: min(760px, 100%); max-height: 92vh; overflow: auto; }
.modal-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
.modal-head h2 { margin: 0; font-size: 22px; }
.modal-desc { margin: 4px 0 0; color: var(--muted); }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.form-grid label { display: grid; gap: 6px; font-weight: 700; }
.field-error { min-height: 18px; color: var(--danger); font-weight: 600; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
.btn:disabled, .select:disabled, .input:disabled { opacity: .6; cursor: not-allowed; transform: none; }
.mdi-spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 720px) {
  .form-grid { grid-template-columns: 1fr; }
  .pagination-bar, .pagination-actions { align-items: stretch; flex-direction: column; }
  .modal-foot { flex-direction: column-reverse; }
  .modal-foot .btn { width: 100%; }
}
</style>
