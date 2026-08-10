<template>
  <!-- Backdrop (Mờ nền) -->
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity"
  >
    <!-- Modal Panel -->
    <div 
      class="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-800">Tạo đợt kiểm kê mới</h3>
        <button 
          @click="closeModal" 
          class="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100"
          :disabled="isSubmitting"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body Form -->Đóng vai trò là một Tech Lead / Frontend Architect. Dự án Vue 3 + Tailwind CSS của chúng tôi đang ở giai đoạn nước rút (Sprint 5). Tôi vừa hoàn thành Task T231 (Danh sách đợt kiểm kê) và T233 (Modal tạo đợt kiểm kê).

Hãy đọc toàn bộ thư mục src/views/ và src/components/, đặc biệt tập trung vào các module Inventory và ImportExcel, sau đó thực hiện 2 việc sau:

Phần 1: Gap Analysis (Đánh giá hiện trạng)
Đối chiếu source code hiện tại với danh sách các task dưới đây để báo cáo xem file/component nào đã có, file nào chưa có, hoặc code nào đang làm dở:

Cụm Chi tiết Kiểm kê (T232, T234, T235, T236):

Cần UI hiển thị danh sách sản phẩm trong đợt kiểm kê (số lượng hệ thống, số lượng thực tế, chênh lệch).

Yêu cầu cốt lõi (T234): Form nhập số lượng thực tế phải là dạng inline-editing (nhập trực tiếp trên bảng), thao tác phải cực nhanh, tuyệt đối KHÔNG bắt user mở modal cho từng dòng.

Cần có nút Chốt (Finalize) / Hủy (Cancel) đợt kiểm kê và khóa UI sau thao tác (T235).

Phải có UI loading, empty state, và xử lý lỗi API (T236).

Cụm Import Excel (T237, T238):

Flow import phải được rút gọn tối đa còn 2 bước: (1) Upload file -> Backend validate -> Nếu hợp lệ mới bật nút (2) Xác nhận Import. Không được để nút validate rời rạc ở Frontend.

Nút tải file mẫu (Template) phải tải đúng bản sạch, không kèm sheet tham chiếu rườm rà.

Phần 2: Actionable Coding Plan (Kế hoạch thực thi)
Sau khi đánh giá, hãy cung cấp cho tôi bản thiết kế Component (dự kiến tên file, các biến state cần có, logic tính toán chênh lệch) và viết mã nguồn hoàn chỉnh cho Task T232 + T234 (Giao diện chi tiết đợt kiểm kê & Bảng nhập liệu inline) để tôi có thể bắt đầu code ngay lập tức. Đảm bảo sử dụng Tailwind CSS đồng bộ với dự án.
      <div class="p-6">
        <form @submit.prevent="handleSubmit">
          
          <!-- Kho (Warehouse) - Bắt buộc -->
          <div class="mb-5">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              Kho kiểm kê <span class="text-red-500">*</span>
            </label>
            <select 
              v-model="formData.warehouseId"
              class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white"
              :class="errors.warehouseId ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-300 focus:border-blue-500'"
              @change="errors.warehouseId = false"
            >
              <option value="" disabled>-- Chọn kho --</option>
              <option v-for="wh in mockWarehouses" :key="wh.id" :value="wh.id">
                {{ wh.name }}
              </option>
            </select>
            <!-- Thông báo lỗi validate -->
            <p v-if="errors.warehouseId" class="text-red-500 text-xs mt-1.5 flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Vui lòng chọn kho để kiểm kê.
            </p>
          </div>

          <!-- Phạm vi kiểm kê (Scope) -->
          <div class="mb-5">
            <label class="block text-sm font-medium text-gray-700 mb-2">Phạm vi kiểm kê</label>
            <div class="flex gap-6">
              <label class="flex items-center cursor-pointer group">
                <input 
                  type="radio" 
                  v-model="formData.scope" 
                  value="ALL" 
                  class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                >
                <span class="ml-2 text-sm text-gray-700 group-hover:text-blue-600 transition-colors">Kiểm kê toàn bộ</span>
              </label>
              <label class="flex items-center cursor-pointer group">
                <input 
                  type="radio" 
                  v-model="formData.scope" 
                  value="PARTIAL" 
                  class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                >
                <span class="ml-2 text-sm text-gray-700 group-hover:text-blue-600 transition-colors">Theo sản phẩm cụ thể</span>
              </label>
            </div>
          </div>

          <!-- Danh sách sản phẩm (Chỉ hiện nếu chọn PARTIAL) -->
          <div v-if="formData.scope === 'PARTIAL'" class="mb-5 bg-gray-50/80 p-4 rounded-lg border border-gray-200">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Chọn sản phẩm <span class="text-red-500">*</span>
            </label>
            <!-- Wrapper có thanh cuộn nếu danh sách dài -->
            <div class="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              <div 
                v-for="product in mockProducts" 
                :key="product.id"
                class="flex items-center py-2 border-b border-gray-100 last:border-0 hover:bg-white transition-colors px-2 rounded"
              >
                <input 
                  type="checkbox" 
                  :id="`product-${product.id}`"
                  :value="product.id"
                  v-model="formData.productIds"
                  class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  @change="errors.productIds = false"
                >
                <label :for="`product-${product.id}`" class="ml-3 text-sm text-gray-700 cursor-pointer flex-1 flex justify-between items-center">
                  <div class="flex flex-col">
                    <span class="font-medium">{{ product.sku }}</span>
                    <span class="text-gray-500 text-xs">{{ product.name }}</span>
                  </div>
                  <span class="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded">Tồn: {{ product.stock }}</span>
                </label>
              </div>
            </div>
            <!-- Thông báo lỗi validate -->
            <p v-if="errors.productIds" class="text-red-500 text-xs mt-2 flex items-center gap-1">
               <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Vui lòng chọn ít nhất một sản phẩm.
            </p>
          </div>

          <!-- Ghi chú -->
          <div class="mb-2">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú (Tùy chọn)</label>
            <textarea 
              v-model="formData.note"
              rows="2"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Nhập lý do kiểm kê..."
            ></textarea>
          </div>

        </form>
      </div>

      <!-- Footer Actions -->
      <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
        <button 
          type="button"
          @click="closeModal"
          class="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
          :disabled="isSubmitting"
        >
          Hủy bỏ
        </button>
        
        <!-- Nút Submit có Loading -->
        <button 
          @click="handleSubmit"
          class="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center min-w-[130px]"
          :disabled="isSubmitting"
        >
          <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span v-if="!isSubmitting">Xác nhận tạo</span>
          <span v-else>Đang xử lý...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'

// ==========================================
// 1. PROPS & EMITS
// ==========================================
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

// ==========================================
// 2. MOCK DATA
// ==========================================
const mockWarehouses = [
  { id: 'WH01', name: 'Kho Tổng Hà Nội' },
  { id: 'WH02', name: 'Kho Chi nhánh HCM' },
  { id: 'WH03', name: 'Kho Lạnh Đà Nẵng' }
]

const mockProducts = [
  { id: 'P001', sku: 'IP14-PRO-128', name: 'iPhone 14 Pro 128GB', stock: 45 },
  { id: 'P002', sku: 'MB-AIR-M2', name: 'MacBook Air M2 256GB', stock: 12 },
  { id: 'P003', sku: 'AP-PRO-2', name: 'AirPods Pro Gen 2', stock: 105 },
  { id: 'P004', sku: 'IPAD-AIR-5', name: 'iPad Air 5 64GB', stock: 30 },
  { id: 'P005', sku: 'AW-S8-45', name: 'Apple Watch Series 8 45mm', stock: 22 },
  { id: 'P006', sku: 'SS-S23-ULT', name: 'Samsung S23 Ultra', stock: 15 }
]

// ==========================================
// 3. STATE (FORM & VALIDATION)
// ==========================================
const formData = reactive({
  warehouseId: '',
  scope: 'ALL', // 'ALL' hoặc 'PARTIAL'
  productIds: [],
  note: ''
})

const errors = reactive({
  warehouseId: false,
  productIds: false
})

const isSubmitting = ref(false)

// ==========================================
// 4. WATCHERS
// ==========================================
// Reset form mỗi khi Modal được mở lên
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    formData.warehouseId = ''
    formData.scope = 'ALL'
    formData.productIds = []
    formData.note = ''
    errors.warehouseId = false
    errors.productIds = false
  }
})

// Tự động clear danh sách sản phẩm nếu người dùng đổi lại scope là 'ALL'
watch(() => formData.scope, (newVal) => {
  if (newVal === 'ALL') {
    formData.productIds = []
    errors.productIds = false
  }
})

// ==========================================
// 5. ACTIONS
// ==========================================
const closeModal = () => {
  if (isSubmitting.value) return // Không cho đóng khi đang tải
  emit('close')
}

const handleSubmit = async () => {
  // --- A. Validate ---
  let isValid = true
  
  if (!formData.warehouseId) {
    errors.warehouseId = true
    isValid = false
  }
  
  if (formData.scope === 'PARTIAL' && formData.productIds.length === 0) {
    errors.productIds = true
    isValid = false
  }

  if (!isValid) return

  // --- B. Xử lý Submit (Giả lập gọi API) ---
  isSubmitting.value = true
  
  try {
    // Giả lập delay mạng 1 giây để xem hiệu ứng loading
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Gói dữ liệu (Payload) gửi ra component cha
    const payload = {
      // Dữ liệu thực tế form
      ...formData,
      
      // Mock thêm các field giống DB để component cha dễ push vào mảng hiển thị
      id: Math.floor(Math.random() * 10000), 
      code: `KK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`,
      warehouseName: mockWarehouses.find(w => w.id === formData.warehouseId)?.name,
      status: 'DRAFT',
      createdDate: new Date().toISOString(),
      createdBy: 'Current User'
    }
    
    // Bắn event báo cha đóng modal và add data
    emit('submit', payload)
    
  } catch (error) {
    console.error(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
/* CSS Custom Scrollbar cho danh sách sản phẩm (chỉ hiển thị trên trình duyệt Webkit) */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent; 
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1; 
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8; 
}
</style>
