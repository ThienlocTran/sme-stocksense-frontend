<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <!-- Main Card -->
    <div class="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      
      <!-- 1. Header Area -->
      <div class="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Đợt kiểm kê kho</h1>
          <p class="text-sm text-gray-500 mt-1">Quản lý danh sách các đợt kiểm kê hàng hóa</p>
        </div>
        <!-- ĐÃ SỬA: Thêm sự kiện @click để mở Modal -->
        <button 
          @click="isCreateModalOpen = true"
          class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          <span>+</span> Tạo đợt kiểm kê
        </button>
      </div>

      <!-- 2. Filter Section -->
      <div class="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <!-- Lọc theo Kho (Warehouse) -->
        <div class="flex flex-col flex-1 min-w-[200px] max-w-xs">
          <label class="text-sm font-medium text-gray-700 mb-1.5">Kho (Warehouse)</label>
          <select 
            v-model="filters.warehouse"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">-- Tất cả kho --</option>
            <option v-for="wh in availableWarehouses" :key="wh" :value="wh">
              {{ wh }}
            </option>
          </select>
        </div>

        <!-- Lọc theo Trạng thái (Status) -->
        <div class="flex flex-col flex-1 min-w-[200px] max-w-xs">
          <label class="text-sm font-medium text-gray-700 mb-1.5">Trạng thái (Status)</label>
          <select 
            v-model="filters.status"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option v-for="status in availableStatuses" :key="status.value" :value="status.value">
              {{ status.label }}
            </option>
          </select>
        </div>

        <!-- Nút Clear Filter -->
        <div class="flex items-end">
          <button 
            @click="clearFilters"
            class="px-4 py-2 text-sm font-medium rounded-lg transition-colors border"
            :class="hasActiveFilters 
              ? 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100 shadow-sm' 
              : 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'"
            :disabled="!hasActiveFilters"
          >
            Làm mới (Clear)
          </button>
        </div>
      </div>

      <!-- 3. Data Table -->
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Mã đợt</th>
              <th scope="col" class="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Kho</th>
              <th scope="col" class="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th scope="col" class="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
              <th scope="col" class="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Người tạo</th>
              <th scope="col" class="px-6 py-3 text-center font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          
          <tbody class="bg-white divide-y divide-gray-200">
            <!-- Render dữ liệu -->
            <tr v-for="item in filteredData" :key="item.id" class="hover:bg-blue-50/50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap font-semibold text-blue-600 cursor-pointer hover:underline">
                {{ item.code }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">
                {{ item.warehouse }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="['px-2.5 py-1 inline-flex text-xs font-semibold rounded-full border', getStatusBadgeClass(item.status)]">
                  {{ formatStatus(item.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-500">
                {{ formatDate(item.createdDate) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-500">
                {{ item.createdBy }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center font-medium">
                <router-link :to="`/inventory/${item.id}`" class="text-blue-600 hover:text-blue-900 transition-colors">Chi tiết</router-link>
              </td>
            </tr>

            <!-- Empty State (Khi filter không ra kết quả) -->
            <tr v-if="filteredData.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-500 bg-gray-50/50">
                <div class="flex flex-col items-center justify-center">
                  <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>Không tìm thấy đợt kiểm kê nào phù hợp với bộ lọc.</p>
                  <button @click="clearFilters" class="mt-2 text-blue-600 hover:underline">Xóa bộ lọc</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Placeholder -->
      <div class="mt-4 flex items-center justify-between text-sm text-gray-500">
        <p>Hiển thị <b>{{ filteredData.length }}</b> kết quả</p>
        <div class="flex gap-1">
          <button class="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>Trước</button>
          <button class="px-3 py-1 border rounded bg-blue-50 text-blue-600 border-blue-200">1</button>
          <button class="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>Sau</button>
        </div>
      </div>
    </div>

    <!-- ĐÃ THÊM: Nhúng component Modal vào đây -->
    <InventoryCountCreateModal 
      :isOpen="isCreateModalOpen"
      @close="isCreateModalOpen = false"
      @submit="handleCreateSubmit"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
// ĐÃ THÊM: Import component Modal
import InventoryCountCreateModal from '../components/InventoryCountCreateModal.vue'

// ==========================================
// THÊM MỚI: QUẢN LÝ MODAL TẠO KIỂM KÊ
// ==========================================
const isCreateModalOpen = ref(false)

const handleCreateSubmit = (newCountPayload) => {
  // Đẩy dữ liệu mới vào đầu mảng mockData để hiển thị ngay trên UI
  mockData.value.unshift({
    id: newCountPayload.id,
    code: newCountPayload.code,
    warehouse: newCountPayload.warehouseName,
    status: newCountPayload.status,
    createdDate: newCountPayload.createdDate,
    createdBy: newCountPayload.createdBy
  })
  
  // Đóng Modal
  isCreateModalOpen.value = false 
  
  // Thông báo giả lập
  alert(`Đã tạo thành công đợt kiểm kê: ${newCountPayload.code}`)
}


// ==========================================
// 1. MOCK DATA (Dữ liệu giả lập)
// ==========================================
const mockData = ref([
  {
    id: 1,
    code: 'KK-202310-001',
    warehouse: 'Kho Tổng Hà Nội',
    status: 'DRAFT',
    createdDate: '2023-10-25T08:30:00Z',
    createdBy: 'Nguyễn Văn A'
  },
  {
    id: 2,
    code: 'KK-202310-002',
    warehouse: 'Kho Chi nhánh HCM',
    status: 'IN_PROGRESS',
    createdDate: '2023-10-24T14:15:00Z',
    createdBy: 'Trần Thị B'
  },
  {
    id: 3,
    code: 'KK-202310-003',
    warehouse: 'Kho Tổng Hà Nội',
    status: 'COMPLETED',
    createdDate: '2023-10-20T09:00:00Z',
    createdBy: 'Lê Văn C'
  },
  {
    id: 4,
    code: 'KK-202310-004',
    warehouse: 'Kho Lạnh Đà Nẵng',
    status: 'CANCELLED',
    createdDate: '2023-10-26T10:45:00Z',
    createdBy: 'Nguyễn Văn A'
  },
  {
    id: 5,
    code: 'KK-202310-005',
    warehouse: 'Kho Chi nhánh HCM',
    status: 'COMPLETED',
    createdDate: '2023-10-15T16:20:00Z',
    createdBy: 'Phạm Văn D'
  }
])

// ==========================================
// 2. STATE & CẤU HÌNH BỘ LỌC (FILTER)
// ==========================================
// Tự động trích xuất danh sách kho duy nhất (Unique) từ mockData
const availableWarehouses = computed(() => {
  return [...new Set(mockData.value.map(item => item.warehouse))]
})

// Cấu hình các trạng thái (Có thể thay đổi text Tiếng Việt tại đây)
const availableStatuses = [
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'IN_PROGRESS', label: 'Đang kiểm kê' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' }
]

// Object chứa các giá trị filter người dùng đang chọn
const filters = reactive({
  warehouse: '',
  status: ''
})

// Kiểm tra xem user có đang filter gì không để style/disable nút "Clear"
const hasActiveFilters = computed(() => filters.warehouse !== '' || filters.status !== '')

// Hàm xóa toàn bộ điều kiện lọc
const clearFilters = () => {
  filters.warehouse = ''
  filters.status = ''
}

// ==========================================
// 3. LOGIC LỌC DỮ LIỆU
// ==========================================
// filteredData sẽ tự động tính toán lại mỗi khi `mockData` hoặc `filters` thay đổi
const filteredData = computed(() => {
  return mockData.value.filter(item => {
    // Nếu filter 'warehouse' rỗng (chọn tất cả) -> luôn true, ngược lại so sánh bằng
    const matchWarehouse = filters.warehouse ? item.warehouse === filters.warehouse : true
    
    // Tương tự với 'status'
    const matchStatus = filters.status ? item.status === filters.status : true
    
    return matchWarehouse && matchStatus
  })
})

// ==========================================
// 4. UTILITY / HELPER FUNCTIONS
// ==========================================
// Chuyển đổi định dạng ngày tháng sang dạng VN
const formatDate = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Lấy nhãn tiếng Việt cho status
const formatStatus = (statusValue) => {
  const statusObj = availableStatuses.find(s => s.value === statusValue)
  return statusObj ? statusObj.label : statusValue
}

// Trả về class Tailwind để tô màu cho Badge dựa trên Status
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-50 text-gray-700 border-gray-200'
    case 'IN_PROGRESS':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'CANCELLED':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}
</script>