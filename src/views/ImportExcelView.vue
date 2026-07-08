<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
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

// Basic config & warehouse states
const importType = ref('PRODUCT_ONLY') // PRODUCT_ONLY or PRODUCT_WITH_OPENING_STOCK
const warehouses = ref([])
const selectedWarehouseId = ref('')
const isLoadingWarehouses = ref(false)

// File picker states
const fileInput = ref(null)
const selectedFile = ref(null)
const fileError = ref('')

// Step statuses & session workflow states
const isDownloadingTemplate = ref(false)
const isCreatingSession = ref(false)
const isValidating = ref(false)
const isConfirming = ref(false)
const isApplying = ref(false)

// Session detail states
const importId = ref(null)
const sessionSummary = ref(null)
const validationResult = ref(null)
const confirmResult = ref(null)
const applyResult = ref(null)

// Error table states (Step 4)
const errorsResponse = ref(null)
const errorPage = ref(0)
const errorSize = ref(20)
const isLoadingErrors = ref(false)

// Warning / Success messages
const globalError = ref('')
const globalWarning = ref('')
const globalSuccess = ref('')
const showApplyConfirm = ref(false)

// Step status computation
const step1Status = computed(() => 'completed')

const step2Status = computed(() => {
  return selectedFile.value ? 'completed' : 'active'
})

const step3Status = computed(() => {
  if (applyResult.value || confirmResult.value || validationResult.value || importId.value) return 'completed'
  return selectedFile.value ? 'active' : 'locked'
})

const step4Status = computed(() => {
  if (applyResult.value || confirmResult.value || (validationResult.value && validationResult.value.valid)) return 'completed'
  if (validationResult.value && !validationResult.value.valid) return 'failed'
  return (importId.value && selectedFile.value) ? 'active' : 'locked'
})

const step5Status = computed(() => {
  if (applyResult.value || confirmResult.value) return 'completed'
  return (validationResult.value && validationResult.value.valid && selectedFile.value) ? 'active' : 'locked'
})

const step6Status = computed(() => {
  if (applyResult.value) return 'completed'
  return (confirmResult.value && selectedFile.value) ? 'active' : 'locked'
})

// Fetch warehouse options
async function fetchWarehouseList() {
  isLoadingWarehouses.value = true
  try {
    const list = await getWarehouses({ status: 'HOAT_DONG' })
    warehouses.value = list || []
  } catch (error) {
    console.error('Không thể tải danh sách kho hàng:', error)
  } finally {
    isLoadingWarehouses.value = false
  }
}

onMounted(() => {
  fetchWarehouseList()
})

// File handlers
function onFileChange(event) {
  const files = event.target.files
  fileError.value = ''
  globalError.value = ''
  globalSuccess.value = ''

  if (!files || files.length === 0) {
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  const file = files[0]
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    fileError.value = 'Chỉ chấp nhận file định dạng .xlsx'
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  selectedFile.value = file
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Watchers for resetting flow on configuration/file change
watch(selectedFile, (newVal, oldVal) => {
  if (!newVal && fileInput.value) {
    fileInput.value.value = ''
  }
  if (importId.value && newVal !== oldVal) {
    resetWorkflowState('File đã thay đổi, vui lòng validate lại từ đầu.')
  }
})

watch([importType, selectedWarehouseId], () => {
  if (importId.value) {
    resetWorkflowState('Cấu hình import đã thay đổi, vui lòng khởi tạo phiên và validate lại từ đầu.')
  }
})

function resetWorkflowState(warningMessage) {
  importId.value = null
  sessionSummary.value = null
  validationResult.value = null
  errorsResponse.value = null
  errorPage.value = 0
  confirmResult.value = null
  applyResult.value = null
  globalWarning.value = warningMessage
  globalSuccess.value = ''
  globalError.value = ''
}

// Step 1: Download template
async function handleDownloadTemplate() {
  isDownloadingTemplate.value = true
  globalError.value = ''
  globalSuccess.value = ''
  try {
    const { data, filename } = await downloadTemplate()
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename || 'SME_StockSense_Import_Template_v1.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    globalSuccess.value = 'Tải file mẫu Excel thành công.'
  } catch (error) {
    globalError.value = error.message || 'Không thể tải file mẫu.'
    if (error.status === 401) router.replace('/login')
  } finally {
    isDownloadingTemplate.value = false
  }
}

// Step 3: Create import session
async function handleCreateSession() {
  if (!selectedFile.value) {
    globalError.value = 'Vui lòng chọn file Excel trước.'
    return
  }

  isCreatingSession.value = true
  globalError.value = ''
  globalSuccess.value = ''
  globalWarning.value = ''

  try {
    const data = await createImportSession(
      selectedFile.value,
      importType.value,
      selectedWarehouseId.value || null
    )
    importId.value = data.id
    sessionSummary.value = data
    globalSuccess.value = `Khởi tạo phiên import thành công (ID: ${data.id}). Hãy thực hiện Validate ở bước tiếp theo.`
  } catch (error) {
    globalError.value = error.message || 'Không thể khởi tạo phiên import.'
    if (error.status === 401) router.replace('/login')
  } finally {
    isCreatingSession.value = false
  }
}

// Step 4: Validate and fetch errors
async function handleValidateSession() {
  if (!importId.value || !selectedFile.value) return

  isValidating.value = true
  globalError.value = ''
  globalSuccess.value = ''
  globalWarning.value = ''
  errorsResponse.value = null
  errorPage.value = 0

  try {
    const response = await validateImportSession(
      importId.value,
      selectedFile.value,
      importType.value,
      selectedWarehouseId.value || null
    )
    validationResult.value = response

    if (response.soDongLoi > 0 || !response.valid) {
      globalError.value = `Dữ liệu file Excel có ${response.soDongLoi} dòng lỗi. Vui lòng xem bảng lỗi bên dưới.`
      await fetchErrors(0)
    } else {
      globalSuccess.value = 'Tất cả dòng dữ liệu hợp lệ! Sẵn sàng xác nhận để import.'
    }
  } catch (error) {
    globalError.value = error.message || 'Không thể kiểm tra dữ liệu file Excel.'
    if (error.status === 401) router.replace('/login')
  } finally {
    isValidating.value = false
  }
}

// Fetch paginated errors
async function fetchErrors(page = 0) {
  if (!importId.value || !selectedFile.value) return
  isLoadingErrors.value = true
  try {
    const data = await getSessionErrors(importId.value, page, errorSize.value)
    errorsResponse.value = data
    errorPage.value = page
  } catch (error) {
    console.error('Lỗi khi tải danh sách lỗi phân trang:', error)
  } finally {
    isLoadingErrors.value = false
  }
}

// Step 5: Confirm import
async function handleConfirmSession() {
  if (!importId.value || !selectedFile.value) return

  isConfirming.value = true
  globalError.value = ''
  globalSuccess.value = ''

  try {
    const response = await confirmImportSession(importId.value)
    confirmResult.value = response
    globalSuccess.value = 'Xác nhận phiên import thành công. Bạn có thể tiến hành Apply dữ liệu.'
  } catch (error) {
    globalError.value = error.message || 'Không thể xác nhận phiên import.'
    if (error.status === 401) router.replace('/login')
  } finally {
    isConfirming.value = false
  }
}

// Step 6: Apply import
async function handleApplySession() {
  showApplyConfirm.value = false
  if (!importId.value || !selectedFile.value) return

  isApplying.value = true
  globalError.value = ''
  globalSuccess.value = ''

  try {
    const response = await applyImportSession(importId.value, selectedFile.value)
    applyResult.value = response
    globalSuccess.value = 'Import dữ liệu Excel vào hệ thống thành công!'
  } catch (error) {
    globalError.value = error.message || 'Không thể áp dụng dữ liệu import.'
    if (error.status === 401) router.replace('/login')
  } finally {
    isApplying.value = false
  }
}

// Reset everything to start fresh
function handleResetAll() {
  selectedFile.value = null
  selectedWarehouseId.value = ''
  if (fileInput.value) fileInput.value.value = ''
  resetWorkflowState('')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleString('vi-VN')
  } catch (e) {
    return dateStr
  }
}
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Import dữ liệu Excel" description="Nhập dữ liệu danh sách sản phẩm hoặc sản phẩm kèm tồn kho đầu kỳ bằng file mẫu Excel." />

    <!-- Message Alert Area -->
    <div class="mt-4">
      <div v-if="globalError" class="p-4 mb-4 text-red-800 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 shadow-sm animate-fade-in">
        <i class="mdi mdi-alert-circle-outline text-lg mt-0.5"></i>
        <div>
          <span class="font-bold">Lỗi: </span>
          <span>{{ globalError }}</span>
        </div>
      </div>

      <div v-if="globalWarning" class="p-4 mb-4 text-yellow-800 rounded-lg bg-yellow-50 border border-yellow-200 flex items-start gap-2 shadow-sm animate-fade-in">
        <i class="mdi mdi-alert-outline text-lg mt-0.5"></i>
        <div>
          <span class="font-bold">Cảnh báo: </span>
          <span>{{ globalWarning }}</span>
        </div>
      </div>

      <div v-if="globalSuccess" class="p-4 mb-4 text-green-800 rounded-lg bg-green-50 border border-green-200 flex items-start gap-2 shadow-sm animate-fade-in">
        <i class="mdi mdi-check-circle-outline text-lg mt-0.5"></i>
        <div>
          <span class="font-bold">Thành công: </span>
          <span>{{ globalSuccess }}</span>
        </div>
      </div>
    </div>

    <!-- Stepper Workflow -->
    <div class="mt-6 flex flex-col gap-6">

      <!-- Step 1: Download Template -->
      <div class="card card-pad step-card" :class="[step1Status]">
        <div class="flex items-start gap-4">
          <div class="step-number" :class="[step1Status]">
            <i class="mdi mdi-check"></i>
          </div>
          <div class="flex-1">
            <h3 class="section-title text-slate-800 flex items-center gap-2">
              Bước 1 — Tải File Mẫu Excel
            </h3>
            <p class="muted mt-1">Dùng file mẫu chuẩn để nhập sản phẩm hoặc sản phẩm kèm tồn kho đầu kỳ.</p>
            <div class="mt-3">
              <button class="btn btn-primary" :disabled="isDownloadingTemplate" @click="handleDownloadTemplate">
                <i v-if="isDownloadingTemplate" class="mdi mdi-loading mdi-spin"></i>
                <i v-else class="mdi mdi-download"></i>
                Tải file mẫu Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Setup Import -->
      <div class="card card-pad step-card" :class="[step2Status]">
        <div class="flex items-start gap-4">
          <div class="step-number" :class="[step2Status]">
            <i v-if="step2Status === 'completed'" class="mdi mdi-check"></i>
            <span v-else>2</span>
          </div>
          <div class="flex-1">
            <h3 class="section-title text-slate-800">Bước 2 — Cấu hình & Chọn File</h3>
            <p class="muted mt-1 mb-4">Lựa chọn loại dữ liệu import, kho hàng (nếu kèm tồn kho) và tải file lên.</p>

            <div class="grid grid-2 md:grid-cols-2 gap-4">
              <!-- Select Import Type -->
              <div class="field">
                <label>Loại import *</label>
                <select v-model="importType" class="select" :disabled="isCreatingSession || isValidating || isConfirming || isApplying || applyResult">
                  <option value="PRODUCT_ONLY">Chỉ sản phẩm (PRODUCT_ONLY)</option>
                  <option value="PRODUCT_WITH_OPENING_STOCK">Sản phẩm + tồn đầu kỳ (PRODUCT_WITH_OPENING_STOCK)</option>
                </select>
              </div>

              <!-- Select Warehouse if Required -->
              <div v-if="importType === 'PRODUCT_WITH_OPENING_STOCK'" class="field">
                <label>Kho nhận hàng đầu kỳ</label>
                <select v-model="selectedWarehouseId" class="select" :disabled="isLoadingWarehouses || isCreatingSession || isValidating || isConfirming || isApplying || applyResult">
                  <option value="">-- Chọn kho hàng nhận tồn đầu kỳ --</option>
                  <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.tenKho }} ({{ w.maKho }})</option>
                </select>
                <small class="text-slate-400 mt-1 block">Có thể để trống nếu file tồn đầu kỳ đã có mã kho theo từng dòng.</small>
                <small v-if="isLoadingWarehouses" class="text-slate-400">Đang tải danh sách kho hàng...</small>
              </div>
            </div>

            <!-- File Upload -->
            <div class="field mt-4">
              <label>Chọn file dữ liệu Excel (.xlsx) *</label>
              <div class="flex flex-wrap items-center gap-3">
                <button class="btn btn-secondary" type="button" :disabled="isCreatingSession || isValidating || isConfirming || isApplying || applyResult" @click="fileInput.click()">
                  <i class="mdi mdi-file-excel-outline"></i>
                  Chọn file từ máy tính
                </button>
                <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="onFileChange" />

                <div v-if="selectedFile" class="flex items-center gap-2 p-2 bg-slate-100 rounded-md border border-slate-200">
                  <i class="mdi mdi-file-check-outline text-green-600 text-lg"></i>
                  <span class="text-sm font-semibold text-slate-700">{{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})</span>
                </div>
                <span v-else class="text-sm text-slate-400">Chưa có file nào được chọn</span>
              </div>
              <small v-if="fileError" class="text-red-600 font-semibold mt-1 block">{{ fileError }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Create Session -->
      <div class="card card-pad step-card" :class="[step3Status]">
        <div class="flex items-start gap-4">
          <div class="step-number" :class="[step3Status]">
            <i v-if="step3Status === 'completed'" class="mdi mdi-check"></i>
            <span v-else>3</span>
          </div>
          <div class="flex-1">
            <h3 class="section-title text-slate-800">Bước 3 — Tạo Phiên Import</h3>
            <p class="muted mt-1">Đăng ký file và loại import với hệ thống để khởi tạo mã phiên.</p>

            <!-- Session details if created -->
            <div v-if="sessionSummary" class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
              <div class="font-bold text-blue-900 mb-1">Chi tiết phiên import khởi tạo:</div>
              <div class="grid grid-2 gap-x-4 gap-y-1">
                <div>Mã phiên import (ID): <span class="font-semibold">{{ sessionSummary.id }}</span></div>
                <div>Tên file gốc: <span class="font-semibold">{{ sessionSummary.tenFile }}</span></div>
                <div>Loại import: <span class="font-semibold">{{ sessionSummary.loaiImport }}</span></div>
                <div>Trạng thái:
                  <span class="font-bold px-2 py-0.5 rounded-full text-xs" :class="sessionSummary.trangThai === 'CHO_XU_LY' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800'">
                    {{ sessionSummary.trangThai }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-3">
              <button class="btn btn-primary" :disabled="step3Status !== 'active' || isCreatingSession || !selectedFile" @click="handleCreateSession">
                <i v-if="isCreatingSession" class="mdi mdi-loading mdi-spin"></i>
                Khởi tạo phiên import
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Validate and Persist Errors -->
      <div class="card card-pad step-card" :class="[step4Status]">
        <div class="flex items-start gap-4">
          <div class="step-number" :class="[step4Status]">
            <i v-if="step4Status === 'completed'" class="mdi mdi-check"></i>
            <i v-else-if="step4Status === 'failed'" class="mdi mdi-close-circle-outline"></i>
            <span v-else>4</span>
          </div>
          <div class="flex-1">
            <h3 class="section-title text-slate-800">Bước 4 — Kiểm Tra Dữ Liệu (Validate)</h3>
            <p class="muted mt-1">Hệ thống sẽ kiểm tra định dạng dữ liệu, sự tồn tại của mã sản phẩm, danh mục và kho hàng.</p>

            <!-- Validation Summary -->
            <div v-if="validationResult" class="mt-3 p-3 rounded-md text-sm border" :class="validationResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'">
              <div class="font-bold mb-1" :class="validationResult.valid ? 'text-green-900' : 'text-red-900'">Kết quả kiểm tra dữ liệu:</div>
              <div class="grid grid-4 gap-2">
                <div>Tổng số dòng: <span class="font-bold">{{ validationResult.tongSoDong }}</span></div>
                <div>Số dòng hợp lệ: <span class="font-bold text-green-700">{{ validationResult.soDongHopLe }}</span></div>
                <div>Số dòng lỗi: <span class="font-bold text-red-700">{{ validationResult.soDongLoi }}</span></div>
                <div>Kết luận:
                  <span class="font-bold" :class="validationResult.valid ? 'text-green-700' : 'text-red-700'">
                    {{ validationResult.valid ? 'HỢP LỆ' : 'KHÔNG HỢP LỆ' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Action button -->
            <div class="mt-3">
              <button class="btn btn-primary" :disabled="step4Status === 'locked' || isValidating || !selectedFile || !importId" @click="handleValidateSession">
                <i v-if="isValidating" class="mdi mdi-loading mdi-spin"></i>
                Kiểm tra dữ liệu Excel
              </button>
            </div>

            <!-- Error Report Table -->
            <div v-if="errorsResponse && errorsResponse.content && errorsResponse.content.length > 0" class="mt-4 border border-red-100 rounded-lg overflow-hidden">
              <div class="bg-red-900 text-white p-3 font-semibold flex items-center gap-2">
                <i class="mdi mdi-alert-box-outline"></i>
                Bảng chi tiết các lỗi dữ liệu trong file Excel (Trang {{ errorsResponse.page + 1 }}/{{ errorsResponse.totalPages }})
              </div>

              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th style="width: 80px;">Dòng</th>
                      <th style="width: 150px;">Cột dữ liệu</th>
                      <th style="width: 180px;">Giá trị trong file</th>
                      <th>Chi tiết lỗi</th>
                      <th>Gợi ý khắc phục</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="err in errorsResponse.content" :key="err.id">
                      <td class="font-bold text-slate-900">{{ err.rowNumber }}</td>
                      <td class="text-red-700 font-semibold">{{ err.columnName }}</td>
                      <td>
                        <code class="px-1.5 py-0.5 bg-slate-100 border rounded text-xs text-slate-800">{{ err.originalValue === null || err.originalValue === '' ? '(trống)' : err.originalValue }}</code>
                      </td>
                      <td class="text-red-600 font-semibold">{{ err.message }}</td>
                      <td class="text-green-700 font-semibold">{{ err.suggestion || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination controls -->
              <div class="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span class="text-sm text-slate-600">Tìm thấy <span class="font-bold">{{ errorsResponse.totalElements }}</span> lỗi dữ liệu</span>
                <div class="flex items-center gap-2">
                  <button class="btn btn-sm" :disabled="errorsResponse.page === 0 || isLoadingErrors" @click="fetchErrors(errorsResponse.page - 1)">
                    <i class="mdi mdi-chevron-left"></i> Trước
                  </button>
                  <span class="text-sm font-semibold">Trang {{ errorsResponse.page + 1 }} / {{ errorsResponse.totalPages }}</span>
                  <button class="btn btn-sm" :disabled="errorsResponse.page >= errorsResponse.totalPages - 1 || isLoadingErrors" @click="fetchErrors(errorsResponse.page + 1)">
                    Sau <i class="mdi mdi-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 5: Confirm -->
      <div class="card card-pad step-card" :class="[step5Status]">
        <div class="flex items-start gap-4">
          <div class="step-number" :class="[step5Status]">
            <i v-if="step5Status === 'completed'" class="mdi mdi-check"></i>
            <span v-else>5</span>
          </div>
          <div class="flex-1">
            <h3 class="section-title text-slate-800">Bước 5 — Xác Nhận</h3>
            <p class="muted mt-1">Xác nhận phiên import đã đầy đủ dữ liệu hợp lệ và sẵn sàng tích hợp vào cơ sở dữ liệu.</p>

            <div v-if="confirmResult" class="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-900">
              <i class="mdi mdi-check-circle text-green-600 mr-1"></i>
              Phiên import đã được chuyển sang trạng thái: <span class="font-bold">{{ confirmResult.status }}</span> (Đã Xác Nhận).
            </div>

            <div class="mt-3">
              <button class="btn btn-primary" :disabled="step5Status !== 'active' || isConfirming || !selectedFile || !importId" @click="handleConfirmSession">
                <i v-if="isConfirming" class="mdi mdi-loading mdi-spin"></i>
                Xác nhận phiên import
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 6: Apply -->
      <div class="card card-pad step-card" :class="[step6Status]">
        <div class="flex items-start gap-4">
          <div class="step-number" :class="[step6Status]">
            <i v-if="step6Status === 'completed'" class="mdi mdi-check"></i>
            <span v-else>6</span>
          </div>
          <div class="flex-1">
            <h3 class="section-title text-slate-800">Bước 6 — Áp Dụng Dữ Liệu</h3>
            <p class="muted mt-1">Thực thi lưu chính thức các sản phẩm mới và cập nhật số lượng tồn kho đầu kỳ tương ứng.</p>

            <div v-if="applyResult" class="mt-3 p-4 bg-slate-100 border border-slate-300 rounded-lg text-slate-800">
              <h4 class="font-bold text-slate-900 mb-2">Kết quả thực thi import thành công:</h4>
              <ul class="list-disc pl-5 space-y-1 text-sm">
                <li>Mã import: <span class="font-semibold">{{ applyResult.importId }}</span></li>
                <li>Trạng thái: <span class="font-bold text-green-700">{{ applyResult.status }}</span></li>
                <li>Thời gian hoàn thành: <span class="font-semibold">{{ formatDate(applyResult.completedAt) }}</span></li>
                <li>Tổng số sản phẩm/khoản mục xử lý: <span class="font-semibold">{{ applyResult.totalRows }}</span></li>
                <li>Số dòng áp dụng thành công: <span class="font-bold text-green-700">{{ applyResult.validRows }}</span></li>
                <li>Thông điệp: <span class="font-semibold">{{ applyResult.message }}</span></li>
              </ul>
            </div>

            <div class="mt-4 flex gap-3">
              <button class="btn btn-success" :disabled="step6Status !== 'active' || isApplying || !selectedFile || !importId" @click="showApplyConfirm = true">
                <i v-if="isApplying" class="mdi mdi-loading mdi-spin"></i>
                Áp dụng import dữ liệu
              </button>

              <button class="btn" type="button" @click="handleResetAll">
                Làm mới từ đầu
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Confirm Apply Dialog -->
    <ConfirmDialog
      :open="showApplyConfirm"
      title="Cảnh báo cập nhật dữ liệu"
      message="Thao tác này sẽ cập nhật dữ liệu sản phẩm/tồn kho chính thức vào hệ thống và ghi nhận các giao dịch nhập tồn kho đầu kỳ. Bạn có chắc chắn muốn thực hiện?"
      confirm-text="Đồng ý import"
      :loading="isApplying"
      @cancel="showApplyConfirm = false"
      @confirm="handleApplySession"
    />
  </div>
</template>

<style scoped>
.step-card {
  border-left: 4px solid transparent;
  transition: all 0.2s ease-in-out;
}

.step-card.completed {
  border-left-color: var(--success);
  background-color: #f0fdf4;
}

.step-card.active {
  border-left-color: var(--primary);
  background-color: #ffffff;
  box-shadow: 0 4px 20px rgba(37, 99, 235, 0.08);
}

.step-card.failed {
  border-left-color: var(--danger);
  background-color: #fef2f2;
}

.step-card.locked {
  border-left-color: var(--border);
  opacity: 0.55;
  background-color: var(--surface-soft);
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 14px;
  flex-shrink: 0;
}

.step-number.completed {
  background-color: var(--success);
  color: #ffffff;
}

.step-number.active {
  background-color: var(--primary);
  color: #ffffff;
}

.step-number.failed {
  background-color: var(--danger);
  color: #ffffff;
}

.step-number.locked {
  background-color: var(--border-strong);
  color: var(--muted);
}

.mdi-spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-out both;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
