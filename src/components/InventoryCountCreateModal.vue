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
              <option v-for="wh in warehouses" :key="wh.id" :value="wh.id">
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
                v-for="product in products" 
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
import { ref, reactive, onMounted } from 'vue'
import { getWarehouses } from '../services/warehouseService'
import { getProducts } from '../services/productService'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

const warehouses = ref([])
const products = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)

const formData = reactive({
  warehouseId: '',
  scope: 'ALL',
  productIds: [],
  note: ''
})

const errors = reactive({
  warehouseId: false,
  productIds: false
})

const fetchInitialData = async () => {
  isLoading.value = true
  try {
    const warehouseData = await getWarehouses({ status: 'HOAT_DONG' })
    warehouses.value = warehouseData.content || warehouseData.data || warehouseData

    const productData = await getProducts()
    products.value = productData.content || productData.data || productData
  } catch (error) {
    console.error('Lỗi tải dữ liệu kho/sản phẩm:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchInitialData()
})

const closeModal = () => {
  if (isSubmitting.value) return
  formData.warehouseId = ''
  formData.scope = 'ALL'
  formData.productIds = []
  formData.note = ''
  errors.warehouseId = false
  errors.productIds = false
  emit('close')
}

const handleSubmit = async () => {
  errors.warehouseId = !formData.warehouseId
  errors.productIds = formData.scope === 'PARTIAL' && formData.productIds.length === 0

  if (errors.warehouseId || errors.productIds) return

  isSubmitting.value = true
  try {
    emit('submit', { ...formData })
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
