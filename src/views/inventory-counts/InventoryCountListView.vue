<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/PageHeader.vue'
import DataTable from '../../components/DataTable.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import EmptyState from '../../components/EmptyState.vue'
import { getInventoryCounts, createInventoryCount } from '../../services/inventoryCountService'
import { getWarehouses } from '../../services/warehouseService'
import { canManageInventoryCounts } from '../../services/permissionService'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const counts = ref([])
const warehouses = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const isCreateOpen = ref(false)
const errorMessage = ref('')
const saveErrorMessage = ref('')

const filters = reactive({
  warehouseId: '',
  status: '',
  page: 0,
  size: 20
})

const countStatusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'DANG_KIEM_KE', label: 'Đang kiểm kê' },
  { value: 'DA_CHOT', label: 'Đã chốt' },
  { value: 'DA_HUY', label: 'Đã hủy' }
]

const authStore = useAuthStore()
const canManage = computed(() => canManageInventoryCounts(authStore.currentUser))

const columns = [
  { key: 'code', label: 'Mã kiểm kê', class: 'cell-compact' },
  { key: 'warehouseName', label: 'Kho hàng' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'createdByName', label: 'Người tạo' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'finalizedAt', label: 'Ngày chốt' },
  { key: 'actions', label: 'Thao tác', class: 'cell-nowrap' }
]

const createForm = reactive({
  warehouseId: '',
  note: ''
})

onMounted(() => {
  fetchCounts()
  fetchWarehouses()
})

async function fetchCounts() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getInventoryCounts({
      warehouseId: filters.warehouseId,
      status: filters.status,
      page: filters.page,
      size: filters.size
    })
    counts.value = res.content || []
  } catch (error) {
    counts.value = []
    errorMessage.value = error.message || 'Không thể tải danh sách kiểm kê.'
  } finally {
    isLoading.value = false
  }
}

async function fetchWarehouses() {
  try {
    const data = await getWarehouses({ status: 'HOAT_DONG' })
    warehouses.value = data || []
  } catch (error) {
    console.error('Không thể tải danh sách kho:', error)
  }
}

function openCreateModal() {
  createForm.warehouseId = ''
  createForm.note = ''
  saveErrorMessage.value = ''
  isCreateOpen.value = true
}

function closeCreateModal() {
  isCreateOpen.value = false
}

async function handleCreate() {
  if (!createForm.warehouseId) {
    saveErrorMessage.value = 'Vui lòng chọn kho hàng cần kiểm kê.'
    return
  }
  isSaving.value = true
  saveErrorMessage.value = ''
  try {
    const payload = {
      warehouseId: Number(createForm.warehouseId),
      note: createForm.note.trim() || null,
      productIds: [] // Mặc định kiểm kê tất cả sản phẩm
    }
    const newCount = await createInventoryCount(payload)
    isCreateOpen.value = false
    router.push(`/inventory-counts/${newCount.id}`)
  } catch (error) {
    saveErrorMessage.value = error.message || 'Không thể tạo đợt kiểm kê.'
  } finally {
    isSaving.value = false
  }
}

function viewDetail(id) {
  router.push(`/inventory-counts/${id}`)
}

function getStatusText(status) {
  if (status === 'DANG_KIEM_KE') return 'Đang kiểm kê'
  if (status === 'DA_CHOT') return 'Đã chốt'
  if (status === 'DA_HUY') return 'Đã hủy'
  return status
}

function formatDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="page-container">
    <PageHeader title="Kiểm kê kho" description="Kiểm tra thực tế và cân bằng tồn kho hệ thống.">
      <button v-if="canManage" class="btn btn-primary" @click="openCreateModal">
        <i class="mdi mdi-plus"></i> Tạo đợt kiểm kê
      </button>
    </PageHeader>

    <!-- Filter Bar -->
    <div class="filter-bar card card-pad">
      <div class="form-group mb-0">
        <label class="label">Kho hàng</label>
        <select class="select" v-model="filters.warehouseId" @change="fetchCounts">
          <option value="">Tất cả kho hàng</option>
          <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name || w.tenKho }}</option>
        </select>
      </div>

      <div class="form-group mb-0">
        <label class="label">Trạng thái</label>
        <select class="select" v-model="filters.status" @change="fetchCounts">
          <option v-for="opt in countStatusOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <i class="mdi mdi-loading mdi-spin"></i> Đang tải dữ liệu...
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="error-alert">
      {{ errorMessage }}
      <button class="btn btn-outline ml-4" @click="fetchCounts">Thử lại</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="counts.length === 0">
      <EmptyState title="Không tìm thấy đợt kiểm kê nào" message="Hãy tạo đợt kiểm kê mới để bắt đầu đối soát số lượng tồn kho." />
    </div>

    <!-- Data Table -->
    <div v-else class="table-container">
      <DataTable :columns="columns" :rows="counts" clickable @row-click="(row) => viewDetail(row.id)">
        <template #code="{ row }">
          <span class="font-semibold text-zinc-900">{{ row.code }}</span>
        </template>
        <template #status="{ row }">
          <StatusBadge :status="getStatusText(row.status)" />
        </template>
        <template #createdAt="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
        <template #finalizedAt="{ row }">
          {{ formatDate(row.finalizedAt || row.cancelledAt) }}
        </template>
        <template #actions="{ row }">
          <button class="btn btn-text" @click.stop="viewDetail(row.id)">
            Xem chi tiết
          </button>
        </template>
      </DataTable>
    </div>

    <!-- Create Modal Dialog -->
    <div v-if="isCreateOpen" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Tạo đợt kiểm kê kho mới</h3>
          <button class="btn-close" @click="closeCreateModal"><i class="mdi mdi-close"></i></button>
        </div>
        <div class="modal-body">
          <div v-if="saveErrorMessage" class="error-alert mb-4">
            {{ saveErrorMessage }}
          </div>

          <div class="form-group">
            <label class="label required">Chọn kho hàng cần kiểm kê</label>
            <select class="select" v-model="createForm.warehouseId">
              <option value="" disabled>-- Chọn kho hàng --</option>
              <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name || w.tenKho }}</option>
            </select>
            <span class="helper-text">Hệ thống sẽ tự động chụp lại dữ liệu tồn kho hiện tại của tất cả sản phẩm đang có trong kho này.</span>
          </div>

          <div class="form-group">
            <label class="label">Ghi chú</label>
            <textarea class="textarea" v-model="createForm.note" placeholder="Nhập lý do kiểm kê, thông tin thêm..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeCreateModal" :disabled="isSaving">Hủy</button>
          <button class="btn btn-primary" @click="handleCreate" :disabled="isSaving">
            {{ isSaving ? 'Đang khởi tạo...' : 'Xác nhận tạo' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
}
.filter-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}
.form-group {
  margin-bottom: 16px;
}
.mb-0 {
  margin-bottom: 0;
}
.mb-4 {
  margin-bottom: 16px;
}
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px;
  font-weight: 500;
  color: #64748b;
}
.error-alert {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}
.helper-text {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  display: block;
}
.ml-4 {
  margin-left: 16px;
}
.font-semibold {
  font-weight: 600;
}
.text-zinc-900 {
  color: #18181b;
}

/* Modal Styling */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}
.modal-card {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
}
.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}
.btn-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}
.btn-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.modal-body {
  padding: 24px;
}
.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
