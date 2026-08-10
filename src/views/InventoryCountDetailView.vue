<template>
  <div class="container mx-auto px-4 py-6 max-w-7xl">
    <!-- Header & Action Buttons -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">
          Chi tiết kiểm kê: <span class="text-blue-600">{{ inventoryCount?.code || '...' }}</span>
        </h1>
        <p class="text-gray-500 mt-1 font-medium">
          Kho: {{ inventoryCount?.warehouseName }} | Ngày tạo: {{ inventoryCount?.createdAt }}
        </p>
      </div>

      <!-- Actions (Chỉ hiện khi chưa chốt/hủy và đã load xong) -->
      <div class="flex gap-3" v-if="!isLoading && !isLocked">
        <button 
          @click="cancelCount" 
          class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          :disabled="isCancelling || isFinalizing"
        >
          <svg v-if="isCancelling" class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Hủy đợt kiểm kê
        </button>
        <button 
          @click="finalizeCount" 
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          :disabled="isCancelling || isFinalizing"
        >
          <svg v-if="isFinalizing" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Chốt kiểm kê (Finalize)
        </button>
      </div>
      
      <!-- Status Badge when locked -->
      <div v-else-if="!isLoading && isLocked" class="px-4 py-2 rounded-lg font-bold shadow-sm" 
           :class="inventoryCount?.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
        {{ inventoryCount?.status === 'COMPLETED' ? 'Đã Chốt (Đã cập nhật tồn kho)' : 'Đã Hủy' }}
      </div>
    </div>

    <!-- UI: Xử lý lỗi API (T236) -->
    <div v-if="error" class="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md shadow-sm">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700 font-medium">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- UI: Loading Skeleton (T236) -->
    <div v-if="isLoading" class="flex justify-center items-center py-24">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>

    <!-- Bảng Danh Sách Sản Phẩm (T232) -->
    <div v-else class="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
      
      <!-- UI: Empty State (T236) -->
      <div v-if="items.length === 0" class="py-20 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 class="mt-4 text-sm font-semibold text-gray-900">Không có sản phẩm nào</h3>
        <p class="mt-1 text-sm text-gray-500">Danh sách kiểm kê hiện đang trống. Hãy thêm sản phẩm vào hệ thống.</p>
      </div>

      <!-- UI: Inline Editing Table (T234) -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã SP</th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Tồn hệ thống</th>
              <!-- Cột nhập liệu có màu nhấn để user chú ý -->
              <th class="px-6 py-4 text-right text-xs font-bold text-blue-600 uppercase tracking-wider w-56">Tồn thực tế</th>
              <th class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Chênh lệch</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="item in items" :key="item.id" class="hover:bg-blue-50/50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.productCode }}</td>
              <td class="px-6 py-4 text-sm text-gray-700">{{ item.productName }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{{ item.systemQuantity }}</td>
              
              <!-- Inline Edit Input -->
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <input 
                  type="number" 
                  v-model.number="item.actualQuantity" 
                  min="0"
                  :disabled="isLocked"
                  class="w-full text-right border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border transition-colors disabled:bg-gray-100 disabled:text-gray-500 disabled:border-transparent"
                  :class="{'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50': item.actualQuantity < 0}"
                />
              </td>
              
              <!-- Tính chênh lệch Auto -->
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                <span :class="{
                  'text-green-600': getDifference(item) > 0,
                  'text-red-600': getDifference(item) < 0,
                  'text-gray-400': getDifference(item) === 0 || isNaN(getDifference(item))
                }">
                  {{ getDifference(item) > 0 ? '+' : '' }}{{ getDifference(item) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const inventoryId = route.params.id || 'fake-id'

// --- State Management ---
const isLoading = ref(true)
const error = ref('')
const isFinalizing = ref(false)
const isCancelling = ref(false)

const inventoryCount = ref(null)
const items = ref([])

// Khóa UI nếu đã chốt hoặc đang call API (T235)
const isLocked = computed(() => {
  return inventoryCount.value?.status === 'COMPLETED' || 
         inventoryCount.value?.status === 'CANCELLED' || 
         isFinalizing.value || 
         isCancelling.value
})

// --- Logic Tính Chênh Lệch ---
const getDifference = (item) => {
  if (item.actualQuantity === null || item.actualQuantity === '') return 0
  return item.actualQuantity - item.systemQuantity
}

// --- API Mocks ---
const fetchDetail = async () => {
  isLoading.value = true
  error.value = ''
  try {
    // Giả lập call API 600ms
    await new Promise(resolve => setTimeout(resolve, 600))
    
    // Dữ liệu Mock
    inventoryCount.value = {
      id: inventoryId,
      code: 'KK-202310-001',
      warehouseName: 'Kho Trung Tâm',
      status: 'IN_PROGRESS',
      createdAt: '10/10/2023 08:30'
    }
    
    items.value = [
      { id: 1, productCode: 'SP001', productName: 'iPhone 15 Pro Max', systemQuantity: 50, actualQuantity: 50 },
      { id: 2, productCode: 'SP002', productName: 'MacBook Air M2', systemQuantity: 15, actualQuantity: 12 },
      { id: 3, productCode: 'SP003', productName: 'AirPods Pro 2', systemQuantity: 100, actualQuantity: 105 },
      { id: 4, productCode: 'SP004', productName: 'iPad Pro 11 inch', systemQuantity: 0, actualQuantity: 2 },
    ]
  } catch (err) {
    error.value = 'Lỗi kết nối. Không thể tải chi tiết đợt kiểm kê.'
  } finally {
    isLoading.value = false
  }
}

// --- Action Handlers (T235) ---
const finalizeCount = async () => {
  if (!confirm('CHÚ Ý: Bạn có chắc chắn muốn chốt kiểm kê? \nSố lượng thực tế sẽ ghi đè lên tồn kho hệ thống và KHÔNG THỂ hoàn tác.')) return
  
  isFinalizing.value = true
  try {
    // Giả lập lưu API
    await new Promise(resolve => setTimeout(resolve, 800))
    
    inventoryCount.value.status = 'COMPLETED'
    // Sau khi chốt thành công, computed isLocked sẽ tự động true -> Disable toàn bộ ô input
  } catch (err) {
    error.value = 'Chốt kiểm kê thất bại. Vui lòng thử lại.'
  } finally {
    isFinalizing.value = false
  }
}

const cancelCount = async () => {
  if (!confirm('Bạn có chắc chắn muốn HỦY đợt kiểm kê này?')) return
  
  isCancelling.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    inventoryCount.value.status = 'CANCELLED'
  } catch (err) {
    error.value = 'Hủy kiểm kê thất bại.'
  } finally {
    isCancelling.value = false
  }
}

// --- Initialization ---
onMounted(() => {
  fetchDetail()
})
</script>
