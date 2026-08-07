<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- 1. Header & General Info -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
        <!-- Decoration background -->
        <div class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 opacity-60"></div>
        
        <div class="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <!-- Cột trái: Thông tin -->
          <div>
            <!-- Nút Quay lại -->
            <button 
              class="text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 text-sm font-medium mb-4 group"
            >
              <svg class="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Quay lại danh sách
            </button>
            
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-bold text-gray-900">{{ countInfo.code }}</h1>
              <span :class="['px-3 py-1 text-xs font-bold rounded-full border', getStatusBadgeClass(countInfo.status)]">
                {{ formatStatus(countInfo.status) }}
              </span>
            </div>
            
            <div class="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                <span>Kho: <strong class="text-gray-900">{{ countInfo.warehouseName }}</strong></span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span>Ngày tạo: <strong class="text-gray-900">{{ formatDate(countInfo.createdDate) }}</strong></span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                <span>Người tạo: <strong class="text-gray-900">{{ countInfo.createdBy }}</strong></span>
              </div>
            </div>
          </div>
          
          <!-- Cột phải: Actions -->
          <div v-if="!isLocked" class="flex items-center gap-3 w-full md:w-auto">
            <button class="flex-1 md:flex-none px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200">
              Lưu nháp
            </button>
            <button @click="openConfirmModal('CANCEL')" class="flex-1 md:flex-none px-5 py-2.5 bg-white border border-red-500 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-200">
              Hủy đợt
            </button>
            <button @click="openConfirmModal('COMPLETE')" class="flex-1 md:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              Chốt kiểm kê
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Data Table (Bảng nhập liệu) -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <!-- Bảng điều khiển phụ -->
        <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 class="text-lg font-semibold text-gray-800">Danh sách sản phẩm kiểm kê</h2>
          
          <!-- Thanh tiến độ siêu nhỏ -->
          <div class="flex items-center gap-3 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm">
            <span class="text-sm text-gray-500">Tiến độ:</span>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-blue-600">{{ progressCount }} / {{ details.length }}</span>
              <div class="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 transition-all duration-300" :style="{ width: `${(progressCount / details.length) * 100}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bảng Grid -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Sản phẩm (SKU - Tên)</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Tồn hệ thống</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-blue-600 uppercase tracking-wider bg-blue-50/50">Tồn thực tế</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Chênh lệch</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ghi chú</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái dòng</th>
              </tr>
            </thead>
            
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr 
                v-for="(item, index) in details" 
                :key="item.id" 
                class="hover:bg-blue-50/30 transition-colors group"
                :class="{'bg-green-50/20': hasChecked(item)}"
              >
                <!-- Cột Sản phẩm -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="font-bold text-gray-800 text-sm mb-0.5">{{ item.sku }}</div>
                  <div class="text-xs text-gray-500 truncate max-w-[250px]">{{ item.name }}</div>
                </td>
                
                <!-- Cột Tồn hệ thống (Read-only) -->
                <td class="px-4 py-4 whitespace-nowrap text-right font-semibold text-gray-600">
                  {{ item.systemQuantity }}
                </td>
                
                <!-- Cột Tồn thực tế (Input Inline) -->
                <td class="px-4 py-4 whitespace-nowrap text-right bg-blue-50/10 group-hover:bg-transparent transition-colors">
                  <input 
                    type="number" 
                    min="0"
                    v-model="item.actualQuantity" 
                    @input="handleActualQuantityInput(item)"
                    :disabled="isLocked"
                    class="w-28 px-3 py-1.5 text-right font-bold text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-300 shadow-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:border-transparent"
                    placeholder="Nhập..."
                    :tabindex="index + 1"
                  >
                </td>
                
                <!-- Cột Chênh lệch (Tự động tính) -->
                <td class="px-4 py-4 whitespace-nowrap text-right">
                  <span class="inline-flex px-2.5 py-1 rounded-md font-bold text-sm bg-gray-50" :class="getDiffColorClass(item)">
                    {{ formatDiff(item) }}
                  </span>
                </td>
                
                <!-- Cột Ghi chú -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <input 
                    type="text" 
                    v-model="item.note"
                    :disabled="isLocked"
                    class="w-full min-w-[150px] px-3 py-1.5 border border-transparent hover:border-gray-300 focus:border-blue-500 bg-transparent focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all text-gray-700 disabled:bg-transparent disabled:text-gray-500 disabled:hover:border-transparent"
                    placeholder="Lý do chênh lệch..."
                    :tabindex="details.length + index + 1"
                  >
                </td>
                
                <!-- Cột Trạng thái dòng -->
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm">
                  <div v-if="hasChecked(item)" class="inline-flex items-center justify-center gap-1.5 text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    Đã kiểm
                  </div>
                  <div v-else class="inline-flex items-center justify-center gap-1.5 text-gray-400 font-medium bg-gray-100 px-2.5 py-1 rounded-full">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Chờ kiểm
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
    </div>

    <!-- Confirm Modal -->
    <div v-if="showConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
        <div class="p-6">
          <div class="flex items-center justify-center w-12 h-12 mx-auto bg-amber-100 rounded-full mb-4">
            <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-center text-gray-900 mb-2">Xác nhận thao tác</h3>
          <p class="text-center text-gray-600 text-sm">
            Bạn có chắc chắn muốn thực hiện hành động này không? Dữ liệu sau khi chốt sẽ không thể thay đổi.
          </p>
        </div>
        <div class="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
          <button @click="closeConfirmModal" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200" :disabled="isProcessing">
            Hủy bỏ
          </button>
          <button @click="handleConfirmAction" class="px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center gap-2" :class="confirmActionType === 'CANCEL' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'" :disabled="isProcessing">
            <svg v-if="isProcessing" class="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ confirmActionType === 'CANCEL' ? 'Đồng ý hủy' : 'Đồng ý chốt' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

// ==========================================
// 1. MOCK DATA (Thông tin chung)
// ==========================================
const countInfo = reactive({
  id: 1,
  code: 'KK-202310-002',
  warehouseId: 'WH02',
  warehouseName: 'Kho Chi nhánh HCM',
  status: 'IN_PROGRESS',
  createdDate: '2023-10-24T14:15:00Z',
  createdBy: 'Trần Thị B'
})

// ==========================================
// 2. MOCK DATA (Danh sách sản phẩm kiểm kê)
// ==========================================
const details = ref([
  { id: 101, sku: 'IP14-PRO-128', name: 'iPhone 14 Pro 128GB - Tím', systemQuantity: 45, actualQuantity: null, note: '' },
  { id: 102, sku: 'MB-AIR-M2', name: 'MacBook Air M2 256GB - Bạc', systemQuantity: 12, actualQuantity: 12, note: '' }, // Khớp 100%
  { id: 103, sku: 'AP-PRO-2', name: 'AirPods Pro Gen 2', systemQuantity: 105, actualQuantity: 100, note: 'Hư hỏng 5 hộp do vận chuyển' }, // Thiếu 5
  { id: 104, sku: 'IPAD-AIR-5', name: 'iPad Air 5 64GB - Xanh', systemQuantity: 30, actualQuantity: 32, note: 'Nhập thừa đợt trước' }, // Dư 2
  { id: 105, sku: 'AW-S8-45', name: 'Apple Watch Series 8 45mm', systemQuantity: 22, actualQuantity: null, note: '' }
])

// ==========================================
// 3. COMPUTED & LOGIC NHẬP LIỆU
// ==========================================

// Khóa giao diện nếu trạng thái là COMPLETED hoặc CANCELLED
const isLocked = computed(() => {
  return countInfo.status === 'COMPLETED' || countInfo.status === 'CANCELLED'
})

// Kiểm tra xem dòng đó đã được nhập actualQuantity chưa
const hasChecked = (item) => {
  return item.actualQuantity !== null && item.actualQuantity !== '' && item.actualQuantity >= 0
}

// Tính số lượng dòng đã kiểm kê xong để vẽ thanh Tiến độ
const progressCount = computed(() => {
  return details.value.filter(hasChecked).length
})

// Validate dữ liệu khi user gõ phím
const handleActualQuantityInput = (item) => {
  // Ngăn chặn nhập số âm
  if (item.actualQuantity !== null && item.actualQuantity < 0) {
    item.actualQuantity = 0
  }
}

// Tính toán class màu sắc cho ô Chênh lệch
const getDiffColorClass = (item) => {
  if (!hasChecked(item)) return 'text-gray-400 bg-gray-50'
  
  const diff = item.actualQuantity - item.systemQuantity
  if (diff > 0) return 'text-emerald-700 bg-emerald-50 border border-emerald-100' // Dư (Xanh lá)
  if (diff < 0) return 'text-red-700 bg-red-50 border border-red-100'             // Thiếu (Đỏ)
  return 'text-gray-500 bg-gray-100'                                              // Khớp (Xám)
}

// Format text hiển thị cho ô Chênh lệch
const formatDiff = (item) => {
  if (!hasChecked(item)) return '?'
  
  const diff = item.actualQuantity - item.systemQuantity
  if (diff > 0) return `+${diff}`
  if (diff === 0) return '0'
  return diff.toString()
}

// ==========================================
// 4. MODAL & API LOGIC
// ==========================================

const showConfirmModal = ref(false)
const confirmActionType = ref('') // 'COMPLETE' or 'CANCEL'
const isProcessing = ref(false)

const openConfirmModal = (type) => {
  confirmActionType.value = type
  showConfirmModal.value = true
}

const closeConfirmModal = () => {
  if (isProcessing.value) return
  showConfirmModal.value = false
  confirmActionType.value = ''
}

const handleConfirmAction = async () => {
  isProcessing.value = true
  
  try {
    const action = confirmActionType.value
    const countId = countInfo.id
    
    // API URL
    const endpoint = action === 'COMPLETE' 
      ? `/api/v1/inventory-counts/${countId}/complete`
      : `/api/v1/inventory-counts/${countId}/cancel`

    /* 
    // MẪU CODE FETCH API GỌI XUỐNG BACKEND THẬT:
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const data = await response.json()
    */

    // MOCK API DELAY 1s
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Thành công -> Cập nhật trạng thái để khóa UI
    if (action === 'COMPLETE') {
      countInfo.status = 'COMPLETED'
    } else {
      countInfo.status = 'CANCELLED'
    }
    
    closeConfirmModal()
  } catch (error) {
    console.error('Lỗi khi thực hiện:', error)
    alert('Có lỗi xảy ra, vui lòng thử lại!')
  } finally {
    isProcessing.value = false
  }
}

// ==========================================
// 5. UTILITY FUNCTIONS
// ==========================================
const formatDate = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date)
}

const formatStatus = (statusValue) => {
  const map = {
    'DRAFT': 'Bản nháp',
    'IN_PROGRESS': 'Đang kiểm kê',
    'COMPLETED': 'Đã chốt',
    'CANCELLED': 'Đã hủy'
  }
  return map[statusValue] || statusValue
}

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'DRAFT': return 'bg-gray-50 text-gray-700 border-gray-200'
    case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200'
    default: return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}
</script>

<style scoped>
/* Xóa nút tăng/giảm mặc định của ô input type="number" cho sạch giao diện */
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
input[type=number] {
  -moz-appearance: textfield;
}
</style>
