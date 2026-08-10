<template>
  <div class="container mx-auto px-4 py-6 max-w-6xl">
    <PageHeader title="Import dữ liệu Excel" description="Nhập dữ liệu danh sách sản phẩm hoặc sản phẩm kèm tồn kho đầu kỳ bằng file mẫu chuẩn." />

    <!-- Message Alert Area -->
    <div class="mt-4 mb-6">
      <div v-if="globalError" class="p-4 text-red-800 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 shadow-sm animate-fade-in">
        <svg class="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div><span class="font-bold">Lỗi: </span><span>{{ globalError }}</span></div>
      </div>
      <div v-if="globalSuccess" class="p-4 text-green-800 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3 shadow-sm animate-fade-in">
        <svg class="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div><span class="font-bold">Thành công: </span><span>{{ globalSuccess }}</span></div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <!-- PHẦN 1: TẢI MẪU & CẤU HÌNH -->
      <div class="md:col-span-1 space-y-6">
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 class="text-lg font-bold text-gray-800 mb-2">1. Tải file mẫu</h3>
          <p class="text-sm text-gray-500 mb-4">Sử dụng đúng template chuẩn (bản sạch) để dữ liệu được xử lý mượt mà nhất.</p>
          <button 
            class="w-full py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 shadow-sm"
            :disabled="isDownloading"
            @click="handleDownloadTemplate"
          >
            <svg v-if="isDownloading" class="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Tải Template
          </button>
        </div>

        <!-- Tùy chọn Import đã được di chuyển sang phía trên khu vực Upload -->
      </div>

      <!-- PHẦN 2: UPLOAD & KẾT QUẢ -->
      <div class="md:col-span-2">
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
          <h3 class="text-lg font-bold text-gray-800 mb-2">2. Upload & Xác nhận</h3>
          <p class="text-sm text-gray-500 mb-6">Hệ thống tự động chạy Validation ngay sau khi file được tải lên.</p>

          <!-- Dropdown Loại dữ liệu Import -->
          <div v-if="!validationResult" class="mb-4">
            <label class="block text-sm font-bold text-gray-700 mb-1">
              Loại dữ liệu Import <span class="text-red-500">*</span>
            </label>
            <select v-model="importType" class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-3 border bg-white" :disabled="isProcessing" :class="{'border-red-300': globalError && !importType}">
              <option value="" disabled>-- Vui lòng chọn loại dữ liệu trước khi tải file --</option>
              <option value="PRODUCT_ONLY">Sản phẩm</option>
              <option value="PRODUCT_WITH_OPENING_STOCK">Tồn đầu kỳ</option>
            </select>
            
            <div v-if="importType === 'PRODUCT_WITH_OPENING_STOCK'" class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Kho nhận tồn đầu kỳ (tùy chọn)</label>
              <select v-model="selectedWarehouseId" class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-3 border bg-white" :disabled="isProcessing">
                <option value="">-- Để trống nếu file đã có mã kho --</option>
                <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.tenKho }}</option>
              </select>
            </div>
          </div>

          <!-- Upload Area (Chỉ hiện khi chưa có kết quả thành công/lỗi nặng) -->
          <div 
            v-if="!validationResult"
            class="border-2 border-dashed rounded-xl p-10 text-center transition-colors mb-6"
            :class="isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <div v-if="isProcessing" class="flex flex-col items-center justify-center">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <p class="text-blue-700 font-semibold text-lg">{{ processingStatusText }}</p>
            </div>
            <div v-else>
              <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="text-base text-gray-600">
                <label for="file-upload" class="relative cursor-pointer bg-white rounded-md font-semibold text-blue-600 hover:text-blue-500 focus-within:outline-none">
                  <span>Chọn file Excel (.xlsx)</span>
                  <input id="file-upload" ref="fileInput" type="file" accept=".xlsx" class="sr-only" @change="onFileChange">
                </label>
                <p class="pl-1 inline">hoặc kéo thả vào đây</p>
              </div>
            </div>
          </div>

          <!-- NẾU FILE HỢP LỆ (Thành công -> Chốt) -->
          <div v-if="validationResult?.valid" class="bg-green-50 rounded-xl p-6 border border-green-200 mt-auto shadow-inner">
            <div class="flex items-center gap-4 mb-6">
              <div class="bg-green-100 p-3 rounded-full"><svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>
              <div>
                <h4 class="text-green-800 font-bold text-lg">Dữ liệu hoàn toàn hợp lệ!</h4>
                <p class="text-green-700">Sẵn sàng nhập <span class="font-bold text-lg">{{ validationResult.soDongHopLe }}</span> dòng dữ liệu vào hệ thống.</p>
              </div>
            </div>
            <button 
              @click="handleFinalImport"
              class="w-full py-3.5 bg-green-600 text-white font-bold text-lg rounded-lg hover:bg-green-700 transition-colors shadow-md flex justify-center items-center gap-2"
              :disabled="isApplying"
            >
              <svg v-if="isApplying" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Xác nhận Import Dữ Liệu
            </button>
            <div class="mt-4 text-center">
              <button @click="resetFlow" class="text-sm text-gray-500 hover:text-gray-700 underline">Hủy bỏ / Chọn file khác</button>
            </div>
          </div>

          <!-- NẾU FILE CÓ LỖI -->
          <div v-if="validationResult && !validationResult.valid" class="flex flex-col h-full">
            <div class="bg-red-50 border border-red-200 rounded-t-lg p-4 flex justify-between items-center">
              <span class="font-bold text-red-800 flex items-center gap-2 text-base">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                Phát hiện {{ validationResult.soDongLoi }} dòng lỗi
              </span>
              <button @click="resetFlow" class="px-4 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 shadow-sm">Thử lại file khác</button>
            </div>
            
            <div class="overflow-x-auto border-x border-b border-red-200 rounded-b-lg">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-red-100/50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Dòng</th>
                    <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Cột lỗi</th>
                    <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Chi tiết</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="err in errorsResponse?.content" :key="err.id" class="text-sm">
                    <td class="px-4 py-3 font-semibold text-gray-900">#{{ err.rowNumber }}</td>
                    <td class="px-4 py-3 text-red-600 font-bold bg-red-50/30">{{ err.columnName }}</td>
                    <td class="px-4 py-3 text-gray-700">
                      <span class="block mb-1">{{ err.message }}</span>
                      <span class="text-xs text-gray-500 block">Dữ liệu gốc: <code class="bg-gray-100 px-1 py-0.5 rounded">{{ err.originalValue || '(trống)' }}</code></span>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <!-- Phân trang lỗi -->
              <div class="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-200" v-if="errorsResponse">
                <span class="text-xs text-gray-500 font-medium">Trang {{ errorsResponse.page + 1 }}/{{ errorsResponse.totalPages }}</span>
                <div class="flex gap-2">
                  <button class="px-3 py-1.5 text-xs font-semibold border rounded bg-white hover:bg-gray-100 disabled:opacity-50" :disabled="errorsResponse.page === 0" @click="fetchErrors(errorsResponse.page - 1)">Trang trước</button>
                  <button class="px-3 py-1.5 text-xs font-semibold border rounded bg-white hover:bg-gray-100 disabled:opacity-50" :disabled="errorsResponse.page >= errorsResponse.totalPages - 1" @click="fetchErrors(errorsResponse.page + 1)">Trang sau</button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import { getWarehouses } from '../services/warehouseService'
import {
  downloadTemplate,
  createImportSession,
  validateImportSession,
  getSessionErrors,
  confirmImportSession,
  applyImportSession
} from '../services/excelImportService'

const router = useRouter()

// -- States --
const importType = ref('')
const warehouses = ref([])
const selectedWarehouseId = ref('')

const isDragging = ref(false)
const fileInput = ref(null)
const selectedFile = ref(null)

const isDownloading = ref(false)
const isProcessing = ref(false)
const isApplying = ref(false)
const processingStatusText = ref('')

const globalError = ref('')
const globalSuccess = ref('')

const importId = ref(null)
const validationResult = ref(null)
const errorsResponse = ref(null)

// -- Lifecycle --
onMounted(async () => {
  try {
    const list = await getWarehouses({ status: 'HOAT_DONG' })
    warehouses.value = list || []
  } catch (error) {
    globalError.value = 'Không tải được danh sách kho.'
  }
})

// -- Utils --
function resetFlow() {
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
  importId.value = null
  validationResult.value = null
  errorsResponse.value = null
  globalError.value = ''
  globalSuccess.value = ''
}

// -- Handlers --
async function handleDownloadTemplate() {
  isDownloading.value = true
  globalError.value = ''
  try {
    const { data, filename } = await downloadTemplate()
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    // Cập nhật tên template sạch như yêu cầu T238
    link.setAttribute('download', filename || 'Template_SME_StockSense_Clean.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    globalError.value = 'Tải file mẫu thất bại. Vui lòng thử lại.'
  } finally {
    isDownloading.value = false
  }
}

function handleDrop(e) {
  isDragging.value = false
  const files = e.dataTransfer.files
  if (files.length > 0) processSelectedFile(files[0])
}

function onFileChange(e) {
  const files = e.target.files
  if (files.length > 0) processSelectedFile(files[0])
}

// KẾT HỢP LUỒNG VALIDATE NGAY LÚC UPLOAD
async function processSelectedFile(file) {
  resetFlow()
  if (!importType.value) {
    globalError.value = 'Vui lòng chọn "Loại dữ liệu Import" trước khi tải file lên.'
    return
  }
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    globalError.value = 'Hệ thống chỉ chấp nhận định dạng Excel (.xlsx)'
    return
  }
  selectedFile.value = file
  isProcessing.value = true

  try {
    // 1. Khởi tạo phiên ngầm
    processingStatusText.value = 'Đang đẩy file lên máy chủ...'
    const sessionInfo = await createImportSession(file, importType.value, selectedWarehouseId.value || null)
    importId.value = sessionInfo.id

    // 2. Tự động gọi Validate ngầm
    processingStatusText.value = 'Đang kiểm tra và xác thực dữ liệu...'
    const validation = await validateImportSession(importId.value, file, importType.value, selectedWarehouseId.value || null)
    validationResult.value = validation

    // 3. Phân nhánh kết quả
    if (validation.soDongLoi > 0 || !validation.valid) {
      await fetchErrors(0)
    }
  } catch (err) {
    globalError.value = err.message || 'Lỗi xử lý file Excel. Vui lòng kiểm tra lại.'
    if (err.status === 401) router.replace('/login')
  } finally {
    isProcessing.value = false
  }
}

async function fetchErrors(page = 0) {
  if (!importId.value) return
  try {
    const data = await getSessionErrors(importId.value, page, 20)
    errorsResponse.value = data
  } catch (err) {
    globalError.value = 'Không tải được chi tiết lỗi.'
  }
}

// KẾT HỢP LUỒNG CONFIRM & APPLY VÀO 1 NÚT XÁC NHẬN
async function handleFinalImport() {
  if (!importId.value || !selectedFile.value) return
  isApplying.value = true
  globalError.value = ''
  try {
    // Gọi Confirm
    await confirmImportSession(importId.value)
    // Gọi Apply ngay sau đó
    await applyImportSession(importId.value, selectedFile.value)
    
    globalSuccess.value = 'Tích hợp dữ liệu vào hệ thống THÀNH CÔNG!'
    validationResult.value = null // Ẩn nút xác nhận
    selectedFile.value = null
  } catch (err) {
    globalError.value = err.message || 'Lỗi khi đồng bộ dữ liệu vào Database.'
  } finally {
    isApplying.value = false
  }
}
</script>

<style scoped>
/* Tailwind CSS đã bao hàm tất cả, không cần thêm style thủ công */
.animate-fade-in {
  animation: fadeIn 0.3s ease-out both;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
