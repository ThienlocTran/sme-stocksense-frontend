<script setup>
/**
 * Màn hình danh sách kho hàng (T44).
 *
 * Nghiệp vụ và Thiết kế:
 * 1. Không xóa vật lý kho để bảo toàn dữ liệu lịch sử nhập/xuất/tồn kho. Thay vào đó, dùng trạng thái HOAT_DONG/NGUNG_HOAT_DONG.
 * 2. Mã kho là duy nhất để định danh và không được cho phép chỉnh sửa nhằm bảo vệ tính toàn vẹn của dữ liệu liên quan.
 * 3. Phân quyền thao tác:
 *    - Admin/IT và Quản lý kho có quyền thực hiện các thao tác quản trị (Thêm/Sửa/Ngừng hoạt động).
 *    - Nhân viên thủ kho chỉ có quyền xem danh sách.
 */

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useInventoryStore } from '../data/useInventoryStore'
import { getWarehouses } from '../services/warehouseService'
import { getWarehouseStatusLabel } from '../constants/warehouseOptions'

const router = useRouter()
const store = useInventoryStore()

const warehouses = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

// Phân quyền thao tác quản trị: Admin / IT và Quản lý kho được phép thực hiện
const canManage = computed(() => store.isAdmin || store.isManager)

const columns = [
  { key: 'maKho', label: 'Mã kho' },
  { key: 'tenKho', label: 'Tên kho' },
  { key: 'diaChi', label: 'Địa chỉ' },
  { key: 'trangThai', label: 'Trạng thái' },
  { key: 'actions', label: 'Thao tác' },
]

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

function displayStatus(status) {
  return getWarehouseStatusLabel(status)
}
</script>

<template>
  <PageHeader title="Kho hàng" description="Quản lý danh sách kho ở mức cơ bản, chưa dùng sơ đồ kệ/vị trí.">
    <!-- Nút Thêm kho chỉ khả dụng với Admin/IT hoặc Quản lý kho, nhưng hiện tại chưa xử lý logic thêm mới ở T44 -->
    <button 
      class="btn btn-primary" 
      type="button" 
      :disabled="!canManage || isLoading"
      title="Thêm kho hàng mới (Yêu cầu quyền Quản lý kho hoặc Admin)"
    >
      <i class="mdi mdi-plus"></i>
      Thêm kho
    </button>
  </PageHeader>

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

      <template #actions>
        <div class="actions">
          <!-- Các nút thao tác chỉ khả dụng với Admin/IT hoặc Quản lý kho, nhưng hiện tại chưa xử lý logic chỉnh sửa ở T44 -->
          <button 
            class="btn btn-sm btn-primary" 
            type="button" 
            :disabled="!canManage || isLoading"
            title="Chỉnh sửa thông tin kho hàng (Yêu cầu quyền Quản lý kho hoặc Admin)"
          >
            Sửa
          </button>
          <button 
            class="btn btn-sm" 
            type="button" 
            :disabled="!canManage || isLoading"
            title="Ngừng hoạt động hoặc Kích hoạt kho hàng (Yêu cầu quyền Quản lý kho hoặc Admin)"
          >
            Ngừng hoạt động
          </button>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.warehouse-alert {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
}
</style>
