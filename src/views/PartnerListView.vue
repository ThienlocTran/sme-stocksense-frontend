<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import DataTable from '../components/DataTable.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PartnerForm from '../components/PartnerForm.vue'
import { getPartners, updatePartner } from '../services/partnerService'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// State
const partners = ref([])
const loading = ref(false)
const isFormOpen = ref(false)
const selectedPartner = ref(null)
const statusUpdatingId = ref(null)

const successMessage = ref('')
const errorMessage = ref('')
const searchDraft = ref('')

const filters = reactive({
  keyword: '',
  loaiDoiTac: '',
  trangThai: ''
})

// Confirmation State
const confirmOpen = ref(false)
const pendingPartner = ref(null)

// Check role logic
const canManage = computed(() => {
  return authStore.currentRole === 'ADMIN' || authStore.currentRole === 'MANAGER'
})

// Computed stats
const stats = computed(() => {
  return {
    total: partners.value.length,
    providers: partners.value.filter(p => p.loaiDoiTac === 'NHA_CUNG_CAP').length,
    customers: partners.value.filter(p => p.loaiDoiTac === 'KHACH_HANG').length,
    both: partners.value.filter(p => p.loaiDoiTac === 'CA_HAI').length
  }
})

const hasActiveFilters = computed(() => {
  return filters.keyword !== '' || filters.loaiDoiTac !== '' || filters.trangThai !== ''
})

const columns = computed(() => {
  const base = [
    { key: 'maDoiTac', label: 'Mã đối tác', class: 'cell-compact' },
    { key: 'tenDoiTac', label: 'Tên đối tác', class: 'cell-long' },
    { key: 'loaiDoiTac', label: 'Loại đối tác', class: 'cell-medium' },
    { key: 'nguoiLienHe', label: 'Người liên hệ', class: 'cell-medium' },
    { key: 'lienHe', label: 'Thông tin liên hệ', class: 'cell-medium' },
    { key: 'trangThai', label: 'Trạng thái', class: 'cell-nowrap' },
  ]
  if (canManage.value) {
    base.push({ key: 'actions', label: 'Thao tác', class: 'cell-nowrap text-right' })
  }
  return base
})

const confirmTitle = computed(() => {
  return pendingPartner.value?.trangThai === 'HOAT_DONG' ? 'Ngừng hoạt động đối tác?' : 'Kích hoạt lại đối tác?'
})

const confirmMessage = computed(() => {
  return pendingPartner.value 
    ? `Bạn có chắc muốn ${pendingPartner.value.trangThai === 'HOAT_DONG' ? 'ngừng hoạt động' : 'kích hoạt lại'} đối tác "${pendingPartner.value.tenDoiTac}"?`
    : ''
})

// MAPPING LABEL
const mapTypeLabel = (type) => {
  switch (type) {
    case 'NHA_CUNG_CAP': return 'Nhà cung cấp'
    case 'KHACH_HANG': return 'Khách hàng'
    case 'CA_HAI': return 'Cả hai'
    default: return type
  }
}

const mapStatusLabel = (status) => {
  switch (status) {
    case 'HOAT_DONG': return 'Đang hoạt động'
    case 'NGUNG_HOAT_DONG': return 'Ngừng hoạt động'
    default: return status
  }
}

// BADGE STYLING
const getTypeBadgeClass = (type) => {
  switch (type) {
    case 'NHA_CUNG_CAP': return 'badge-tag--primary'
    case 'KHACH_HANG': return 'badge-tag--success'
    case 'CA_HAI': return 'badge-tag--warning'
    default: return 'badge-tag--neutral'
  }
}

const getTypeIcon = (type) => {
  switch (type) {
    case 'NHA_CUNG_CAP': return 'mdi-truck-delivery-outline'
    case 'KHACH_HANG': return 'mdi-account-cash-outline'
    case 'CA_HAI': return 'mdi-handshake'
    default: return 'mdi-help-circle-outline'
  }
}

// CALL API
const fetchPartners = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    partners.value = await getPartners(filters)
  } catch (error) {
    console.error('Không thể tải danh sách đối tác:', error)
    partners.value = []
    errorMessage.value = error.message
    if (error.status === 401) router.replace('/login')
  } finally {
    loading.value = false
  }
}

// Open Form Add/Edit
const openAddForm = () => {
  selectedPartner.value = null
  successMessage.value = ''
  isFormOpen.value = true
}

const openEditForm = (partner) => {
  selectedPartner.value = partner
  successMessage.value = ''
  isFormOpen.value = true
}

// Post-saved handler
const handlePartnerSaved = () => {
  successMessage.value = selectedPartner.value ? 'Cập nhật thông tin đối tác thành công!' : 'Thêm mới đối tác thành công!'
  fetchPartners()
}

// Toggle status triggers
const confirmTogglePartner = (partner) => {
  pendingPartner.value = partner
  confirmOpen.value = true
}

const cancelToggle = () => {
  pendingPartner.value = null
  confirmOpen.value = false
}

const executeTogglePartnerStatus = async () => {
  if (!pendingPartner.value) return
  
  const partner = pendingPartner.value
  statusUpdatingId.value = partner.id
  errorMessage.value = ''
  successMessage.value = ''
  
  const newStatus = partner.trangThai === 'HOAT_DONG' ? 'NGUNG_HOAT_DONG' : 'HOAT_DONG'
  
  const payload = {
    tenDoiTac: partner.tenDoiTac,
    loaiDoiTac: partner.loaiDoiTac,
    nguoiLienHe: partner.nguoiLienHe,
    soDienThoai: partner.soDienThoai,
    email: partner.email,
    diaChi: partner.diaChi,
    trangThai: newStatus
  }
  
  try {
    const updated = await updatePartner(partner.id, payload)
    const idx = partners.value.findIndex(p => p.id === partner.id)
    if (idx !== -1) {
      partners.value[idx] = updated
    }
    successMessage.value = newStatus === 'HOAT_DONG' ? 'Đã kích hoạt lại đối tác thành công.' : 'Đã ngừng hoạt động đối tác thành công.'
  } catch (error) {
    console.error('Lỗi khi thay đổi trạng thái đối tác:', error)
    errorMessage.value = error.message || 'Thao tác thất bại. Vui lòng kiểm tra lại.'
    if (error.status === 401) router.replace('/login')
  } finally {
    statusUpdatingId.value = null
    confirmOpen.value = false
    pendingPartner.value = null
  }
}

// Reset filters
const resetFilters = () => {
  searchDraft.value = ''
  filters.keyword = ''
  filters.loaiDoiTac = ''
  filters.trangThai = ''
  fetchPartners()
}

const applySearch = () => {
  filters.keyword = searchDraft.value.trim()
  fetchPartners()
}

const applyFilter = () => {
  fetchPartners()
}

onMounted(() => {
  fetchPartners()
})
</script>

<template>
  <div class="page-container page-shell">
    
    <!-- Header Page -->
    <PageHeader title="Đối tác" description="Quản lý danh sách nhà cung cấp, khách hàng và thông tin liên hệ của doanh nghiệp.">
      <!-- Add Button (Visible only to Admin/Manager) -->
      <button v-if="canManage" class="btn btn-primary" @click="openAddForm" :disabled="loading">
        <i class="mdi mdi-plus"></i>
        Thêm đối tác
      </button>
    </PageHeader>

    <!-- Stats Summary Widgets -->
    <div class="grid grid-4 mb-6">
      <div class="card card-pad flex items-center gap-3">
        <div class="p-2.5 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center">
          <i class="mdi mdi-account-multiple text-xl"></i>
        </div>
        <div>
          <span class="text-xs text-zinc-500 block">Tổng đối tác</span>
          <strong class="text-xl font-bold text-zinc-900">{{ stats.total }}</strong>
        </div>
      </div>
      <div class="card card-pad flex items-center gap-3">
        <div class="p-2.5 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <i class="mdi mdi-truck-delivery-outline text-xl"></i>
        </div>
        <div>
          <span class="text-xs text-zinc-500 block">Nhà cung cấp</span>
          <strong class="text-xl font-bold text-zinc-900">{{ stats.providers }}</strong>
        </div>
      </div>
      <div class="card card-pad flex items-center gap-3">
        <div class="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <i class="mdi mdi-account-cash-outline text-xl"></i>
        </div>
        <div>
          <span class="text-xs text-zinc-500 block">Khách hàng</span>
          <strong class="text-xl font-bold text-zinc-900">{{ stats.customers }}</strong>
        </div>
      </div>
      <div class="card card-pad flex items-center gap-3">
        <div class="p-2.5 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
          <i class="mdi mdi-handshake text-xl"></i>
        </div>
        <div>
          <span class="text-xs text-zinc-500 block">Cả hai vai trò</span>
          <strong class="text-xl font-bold text-zinc-900">{{ stats.both }}</strong>
        </div>
      </div>
    </div>

    <!-- Filters Section -->
    <SearchFilterBar v-model="searchDraft" class="mb-4" placeholder="Tìm theo mã, tên, SĐT...">
      <button class="btn btn-primary" type="button" :disabled="loading" @click="applySearch">
        <i class="mdi mdi-magnify"></i>
        Tìm kiếm
      </button>
      <select v-model="filters.loaiDoiTac" class="select" :disabled="loading" @change="applyFilter">
        <option value="">Tất cả loại đối tác</option>
        <option value="NHA_CUNG_CAP">Nhà cung cấp</option>
        <option value="KHACH_HANG">Khách hàng</option>
        <option value="CA_HAI">Cả hai</option>
      </select>
      <select v-model="filters.trangThai" class="select" :disabled="loading" @change="applyFilter">
        <option value="">Tất cả trạng thái</option>
        <option value="HOAT_DONG">Đang hoạt động</option>
        <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
      </select>
      <button v-if="hasActiveFilters" class="btn btn-ghost" type="button" :disabled="loading" @click="resetFilters">
        <i class="mdi mdi-filter-off"></i> Xóa lọc
      </button>
    </SearchFilterBar>

    <!-- Alerts -->
    <div v-if="successMessage" class="alert-box alert-box--success mb-4">
      <i class="mdi mdi-check-circle-outline"></i>
      <span>{{ successMessage }}</span>
    </div>
    <div v-if="errorMessage" class="alert-box alert-box--error mb-4">
      <i class="mdi mdi-alert-circle-outline"></i>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Table Section -->
    <div class="table-container">
      <div v-if="loading" class="loading-state card card-pad">
        <i class="mdi mdi-loading mdi-spin"></i>
        <span>Đang tải danh sách đối tác...</span>
      </div>

      <DataTable 
        v-else 
        :columns="columns" 
        :rows="partners" 
        empty-text="Không tìm thấy đối tác nào phù hợp"
        min-width="1100px"
      >
        <template #maDoiTac="{ value }">
          <code class="partner-code">{{ value }}</code>
        </template>

        <template #loaiDoiTac="{ value }">
          <span class="badge-tag" :class="getTypeBadgeClass(value)">
            <i class="mdi" :class="getTypeIcon(value)"></i>
            {{ mapTypeLabel(value) }}
          </span>
        </template>

        <template #lienHe="{ row }">
          <div class="contact-details">
            <div v-if="row.soDienThoai" class="contact-item">
              <i class="mdi mdi-phone"></i>
              <span>{{ row.soDienThoai }}</span>
            </div>
            <div v-if="row.email" class="contact-item">
              <i class="mdi mdi-email-outline"></i>
              <span>{{ row.email }}</span>
            </div>
            <span v-if="!row.soDienThoai && !row.email" class="text-zinc-400">—</span>
          </div>
        </template>

        <template #trangThai="{ value }">
          <span 
            class="status-dot-wrap"
            :class="value === 'HOAT_DONG' ? 'status-dot-wrap--active' : 'status-dot-wrap--inactive'"
          >
            <span class="status-dot"></span>
            {{ mapStatusLabel(value) }}
          </span>
        </template>

        <template #actions="{ row }">
          <div class="actions justify-end">
            <button class="btn btn-sm btn-secondary" @click="openEditForm(row)">Sửa</button>
            <button 
              class="btn btn-sm" 
              :class="row.trangThai === 'HOAT_DONG' ? 'btn-danger' : 'btn-success'"
              @click="confirmTogglePartner(row)"
              :disabled="statusUpdatingId === row.id"
            >
              {{ row.trangThai === 'HOAT_DONG' ? 'Ngừng' : 'Mở' }}
            </button>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Partner Form Dialog -->
    <PartnerForm
      v-model="isFormOpen"
      :partner="selectedPartner"
      @saved="handlePartnerSaved"
    />

    <!-- Confirm Dialog -->
    <ConfirmDialog
      :open="confirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      confirm-text="Xác nhận"
      :danger="pendingPartner?.trangThai === 'HOAT_DONG'"
      :loading="statusUpdatingId !== null"
      @cancel="cancelToggle"
      @confirm="executeTogglePartnerStatus"
    />
  </div>
</template>

<style scoped>
.badge-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
}
.badge-tag--primary {
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}
.badge-tag--success {
  background: var(--color-success-soft);
  color: var(--color-success);
}
.badge-tag--warning {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}
.badge-tag--neutral {
  background: var(--color-bg);
  color: var(--color-text-secondary);
}

.partner-code {
  font-family: monospace;
  padding: 2px 6px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 12px;
}

.contact-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.contact-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.contact-item i {
  color: var(--color-text-muted);
}

.status-dot-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.status-dot-wrap--active {
  color: var(--color-success);
}
.status-dot-wrap--active .status-dot {
  background-color: var(--color-success);
}
.status-dot-wrap--inactive {
  color: var(--color-text-secondary);
}
.status-dot-wrap--inactive .status-dot {
  background-color: var(--color-text-muted);
}

.alert-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid transparent;
}
.alert-box--success {
  background-color: var(--color-success-soft);
  border-color: rgba(22, 130, 93, 0.2);
  color: var(--color-success);
}
.alert-box--error {
  background-color: var(--color-danger-soft);
  border-color: rgba(220, 38, 38, 0.2);
  color: var(--color-danger);
}
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  color: var(--color-text-secondary);
  font-weight: 600;
}
.mdi-spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

:deep(.cell-compact) { width: 110px; }
:deep(.cell-medium) { width: 160px; }
:deep(.cell-long) { min-width: 200px; }
:deep(.cell-nowrap) { white-space: nowrap; }
</style>
