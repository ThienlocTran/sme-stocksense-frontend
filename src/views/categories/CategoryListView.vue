<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '../../components/DataTable.vue'
import PageHeader from '../../components/PageHeader.vue'
import SearchFilterBar from '../../components/SearchFilterBar.vue'
import { categoryStatusOptions, getCategoryStatusLabel } from '../../constants/categoryOptions'
import { getCategories } from '../../services/categoryService'

const router = useRouter()
const categories = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const searchDraft = ref('')
const filters = reactive({ keyword: '', status: '', page: 0, size: 10 })
const pageInfo = reactive({ totalElements: 0, totalPages: 0 })

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
  <PageHeader title="Danh mục" description="Danh sách nhóm sản phẩm theo mã, tên và trạng thái." />

  <SearchFilterBar v-model="searchDraft" placeholder="Tìm theo mã hoặc tên danh mục">
    <button class="btn btn-primary" type="button" :disabled="isLoading" @click="applySearch">
      <i class="mdi mdi-magnify"></i>
      Tìm kiếm
    </button>
    <select v-model="filters.status" class="select" :disabled="isLoading" @change="applyFilter">
      <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
  </SearchFilterBar>

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
      <template #actions>
        <div class="actions">
          <button class="btn btn-sm btn-primary" type="button" disabled>Sửa</button>
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
</template>

<style scoped>
.category-alert { margin-bottom: 16px; display: flex; align-items: center; gap: 10px; color: #991b1b; background: #fef2f2; border-color: #fecaca; }
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
.btn:disabled, .select:disabled { opacity: 0.6; cursor: not-allowed; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .category-pagination, .pagination-actions { align-items: stretch; flex-direction: column; width: 100%; }
  .page-size, .pagination-actions .btn, .page-indicator { width: 100%; }
}
</style>
