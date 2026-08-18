<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentRoleCode } from '../services/authService'
import { canOperateImportExcel } from '../services/permissionService'
import PageHeader from '../components/PageHeader.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { getWarehouses } from '../services/warehouseService'
import {
  downloadTemplate,
  validateFile,
  createImportSession,
  confirmImportSession,
  applyImportSession,
} from '../services/excelImportService'

const router = useRouter()
const canOperate = computed(() => canOperateImportExcel(getCurrentRoleCode()))

// Config states
const importType = ref('PRODUCT_ONLY')
const warehouses = ref([])
const selectedWarehouseId = ref('')
const isLoadingWarehouses = ref(false)
const warehouseError = ref('')

// File
const fileInput = ref(null)
const selectedFile = ref(null)
const fileError = ref('')

// UI state machine: idle | validating | validated | importing | done
const phase = ref('idle') // idle | validating | validated | importing | done

// Validation result from POST /validate (contains errors inline)
const validationResult = ref(null)

// Session ID after create
const importId = ref(null)

// Final result
const applyResult = ref(null)

// Confirm dialog
const showConfirmDialog = ref(false)

// Global messages
const globalError = ref('')
const globalSuccess = ref('')

// ─── Warehouses ──────────────────────────────────────────────────────────────
async function fetchWarehouseList() {
  isLoadingWarehouses.value = true
  warehouseError.value = ''
  try {
    const list = await getWarehouses({ status: 'HOAT_DONG' })
    warehouses.value = list || []
  } catch (error) {
    warehouseError.value = error.message || 'Không thể tải danh sách kho hàng.'
  } finally {
    isLoadingWarehouses.value = false
  }
}

onMounted(() => { fetchWarehouseList() })

// ─── File picker ──────────────────────────────────────────────────────────────
function onFileChange(event) {
  const file = event.target.files?.[0]
  fileError.value = ''
  globalError.value = ''
  globalSuccess.value = ''
  validationResult.value = null
  importId.value = null
  applyResult.value = null
  phase.value = 'idle'

  if (!file) { selectedFile.value = null; return }
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    fileError.value = 'Chỉ chấp nhận file định dạng .xlsx'
    selectedFile.value = null
    event.target.value = ''
    return
  }
  selectedFile.value = file
}

function formatFileSize(bytes) {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ─── Download template ────────────────────────────────────────────────────────
const isDownloadingTemplate = ref(false)

async function handleDownloadTemplate() {
  isDownloadingTemplate.value = true
  globalError.value = ''
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
  } catch (error) {
    globalError.value = error.message || 'Không thể tải file mẫu.'
    if (error.status === 401) router.replace('/login')
  } finally {
    isDownloadingTemplate.value = false
  }
}

// ─── Step 1: Upload & Validate (single call) ──────────────────────────────────
async function handleUploadAndValidate() {
  if (!selectedFile.value) { fileError.value = 'Vui lòng chọn file Excel trước.'; return }

  phase.value = 'validating'
  globalError.value = ''
  globalSuccess.value = ''
  validationResult.value = null
  importId.value = null
  applyResult.value = null

  try {
    const result = await validateFile(
      selectedFile.value,
      importType.value,
      selectedWarehouseId.value || null
    )
    validationResult.value = result
    phase.value = 'validated'

    if (result.valid) {
      globalSuccess.value = `Tất cả ${result.tongSoDong} dòng dữ liệu hợp lệ. Nhấn "Xác nhận Import" để hoàn tất.`
    } else {
      globalError.value = `File có ${result.soDongLoi} dòng lỗi. Vui lòng sửa file và tải lại.`
    }
  } catch (error) {
    globalError.value = error.message || 'Không thể kiểm tra file Excel.'
    if (error.status === 401) router.replace('/login')
    phase.value = 'idle'
  }
}

// ─── Step 2: Create session → confirm → apply (auto-chained) ─────────────────
async function handleConfirmImport() {
  showConfirmDialog.value = false
  if (!selectedFile.value || !validationResult.value?.valid) return

  phase.value = 'importing'
  globalError.value = ''
  globalSuccess.value = ''

  try {
    // 2a. Create session (uploads file again to get an ID)
    const session = await createImportSession(
      selectedFile.value,
      importType.value,
      selectedWarehouseId.value || null
    )
    importId.value = session.id

    // 2b. Confirm
    await confirmImportSession(session.id)

    // 2c. Apply
    const result = await applyImportSession(session.id, selectedFile.value)
    applyResult.value = result
    phase.value = 'done'
    globalSuccess.value = `Import thành công! ${result.validRows ?? result.totalRows} sản phẩm đã được tích hợp vào hệ thống.`
  } catch (error) {
    globalError.value = error.message || 'Import thất bại. Vui lòng thử lại.'
    if (error.status === 401) router.replace('/login')
    phase.value = 'validated'
  }
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function handleReset() {
  selectedFile.value = null
  selectedWarehouseId.value = ''
  if (fileInput.value) fileInput.value.value = ''
  validationResult.value = null
  importId.value = null
  applyResult.value = null
  phase.value = 'idle'
  globalError.value = ''
  globalSuccess.value = ''
  fileError.value = ''
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try { return new Date(dateStr).toLocaleString('vi-VN') } catch { return dateStr }
}
</script>

<template>
  <div class="page-shell">
    <PageHeader
      title="Import dữ liệu Excel"
      description="Tải file Excel lên, hệ thống kiểm tra dữ liệu tự động. Nhấn xác nhận để import vào hệ thống."
    />

    <!-- Global messages -->
    <div class="mt-4 flex flex-col gap-2">
      <div v-if="globalError" class="alert alert-error animate-fade-in">
        <i class="mdi mdi-alert-circle-outline text-lg"></i>
        <div><span class="font-bold">Lỗi: </span>{{ globalError }}</div>
      </div>
      <div v-if="globalSuccess" class="alert alert-success animate-fade-in">
        <i class="mdi mdi-check-circle-outline text-lg"></i>
        <div><span class="font-bold">Thành công: </span>{{ globalSuccess }}</div>
      </div>
    </div>

    <div class="mt-6 flex flex-col gap-5">

      <!-- ── STEP 1: CONFIG & TEMPLATE ─────────────────────────────────────── -->
      <div class="card card-pad" :class="{ 'card-done': phase === 'done' || validationResult }">
        <div class="card-section-header">
          <div class="step-badge" :class="phase === 'done' || validationResult ? 'badge-done' : 'badge-active'">
            <i v-if="phase === 'done' || validationResult" class="mdi mdi-check"></i>
            <span v-else>1</span>
          </div>
          <div>
            <h3 class="section-title">Bước 1: Cấu hình & Tải file mẫu</h3>
            <p class="muted mt-0.5">Chọn loại import, kho hàng đầu kỳ và tải về tệp Excel mẫu tiêu chuẩn.</p>
          </div>
        </div>

        <div class="card-body mt-4 flex flex-col gap-4">
          <!-- Row: Import type + Warehouse -->
          <div class="grid grid-2 gap-4">
            <div class="field">
              <label class="field-label">Cấu hình kiểu nhập liệu *</label>
              <select
                v-model="importType"
                class="select"
                :disabled="phase === 'validating' || phase === 'importing' || phase === 'done'"
              >
                <option value="PRODUCT_ONLY">Chỉ danh mục sản phẩm</option>
                <option value="PRODUCT_WITH_OPENING_STOCK">Sản phẩm + tồn kho ban đầu</option>
              </select>
              <span class="text-xs text-[var(--color-text-secondary)] mt-1 block">
                {{ importType === 'PRODUCT_ONLY' 
                  ? 'Nhập thông tin sản phẩm vào hệ thống, không thiết lập số lượng tồn kho ban đầu.' 
                  : 'Nhập sản phẩm và số lượng hiện có tại thời điểm doanh nghiệp bắt đầu sử dụng StockSense.' }}
              </span>
            </div>

            <div v-if="importType === 'PRODUCT_WITH_OPENING_STOCK'" class="field">
              <label class="field-label">Kho ghi nhận tồn ban đầu</label>
              <select
                v-model="selectedWarehouseId"
                class="select"
                :disabled="isLoadingWarehouses || phase === 'validating' || phase === 'importing' || phase === 'done'"
              >
                <option value="">-- Chọn kho hàng (để trống nếu có trong file) --</option>
                <option v-for="w in warehouses" :key="w.id" :value="w.id">
                  {{ w.tenKho }} ({{ w.maKho }})
                </option>
              </select>
              <span class="text-xs text-[var(--color-text-secondary)] mt-1 block">
                Số lượng tồn trong file sẽ được ghi nhận vào kho này nếu dòng dữ liệu không chỉ định kho riêng.
              </span>
              <small v-if="isLoadingWarehouses" class="text-slate-400">Đang tải kho hàng...</small>
              <small v-if="warehouseError" class="text-red-600 font-semibold mt-1 block">{{ warehouseError }}</small>
            </div>
          </div>

          <!-- Download template button unconditional -->
          <div class="flex items-center gap-3 mt-2">
            <button class="btn btn-ghost" type="button" :disabled="isDownloadingTemplate" @click="handleDownloadTemplate">
              <i v-if="isDownloadingTemplate" class="mdi mdi-loading mdi-spin"></i>
              <i v-else class="mdi mdi-download-outline"></i>
              Tải file mẫu Excel
            </button>
            <span class="text-xs text-slate-500">Sử dụng file mẫu này để nhập dữ liệu đúng định dạng của hệ thống.</span>
          </div>
        </div>
      </div>

      <!-- ── STEP 2: UPLOAD FILE & VALIDATE ─────────────────────────────────── -->
      <div class="card card-pad" :class="{ 'card-done': phase === 'done' || validationResult, 'card-locked': phase !== 'done' && !validationResult && !importType }">
        <div class="card-section-header">
          <div class="step-badge" :class="phase === 'done' || validationResult ? 'badge-done' : 'badge-active'">
            <i v-if="phase === 'done' || validationResult" class="mdi mdi-check"></i>
            <span v-else>2</span>
          </div>
          <div>
            <h3 class="section-title">Bước 2: Chọn & Kiểm tra file dữ liệu</h3>
            <p class="muted mt-0.5">Tải lên tệp Excel của bạn và chạy quá trình kiểm tra lỗi tự động.</p>
          </div>
        </div>

        <div class="card-body mt-4 flex flex-col gap-4">
          <div v-if="!canOperate" class="alert alert-error mb-2">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>Bạn không có quyền tải lên hoặc xác nhận import file Excel (Chỉ khả dụng cho Admin và Nhân viên kho).</span>
          </div>

          <!-- File picker row -->
          <div class="field">
            <label>File dữ liệu Excel (.xlsx) *</label>
            <div class="file-picker-row">
              <button
                class="btn btn-secondary"
                type="button"
                :disabled="!canOperate || phase === 'validating' || phase === 'importing' || phase === 'done'"
                @click="fileInput.click()"
              >
                <i class="mdi mdi-file-excel-outline"></i>
                Chọn file từ máy tính
              </button>
              <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="onFileChange" />

              <div v-if="selectedFile" class="file-badge">
                <i class="mdi mdi-file-check-outline text-green-600"></i>
                <span>{{ selectedFile.name }} <span class="text-slate-400">({{ formatFileSize(selectedFile.size) }})</span></span>
              </div>
              <span v-else class="text-sm text-slate-400">Chưa có file nào được chọn</span>
            </div>
            <small v-if="fileError" class="text-red-600 font-semibold mt-1 block">{{ fileError }}</small>
          </div>

          <!-- Action row -->
          <div class="flex flex-wrap items-center gap-3">
            <button
              id="btn-upload-validate"
              class="btn btn-primary"
              :disabled="!canOperate || !selectedFile || phase === 'validating' || phase === 'importing' || phase === 'done'"
              @click="handleUploadAndValidate"
            >
              <i v-if="phase === 'validating'" class="mdi mdi-loading mdi-spin"></i>
              <i v-else class="mdi mdi-upload-outline"></i>
              {{ phase === 'validating' ? 'Đang kiểm tra...' : 'Tải lên & Kiểm tra dữ liệu' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── STEP 3: VALIDATE & PREVIEW (Shown when validationResult exists) ─ -->
      <template v-if="validationResult">
        <div class="card card-pad" :class="{ 'card-done': phase === 'done', 'card-locked': !validationResult.valid }">
          <div class="card-section-header">
            <div class="step-badge" :class="phase === 'done' ? 'badge-done' : validationResult.valid ? 'badge-active' : 'badge-locked'">
              <i v-if="phase === 'done'" class="mdi mdi-check"></i>
              <i v-else-if="!validationResult.valid" class="mdi mdi-alert-circle-outline"></i>
              <span v-else>3</span>
            </div>
            <div>
              <h3 class="section-title">Bước 3: Xem trước dữ liệu</h3>
              <p class="muted mt-0.5">
                <template v-if="!validationResult.valid">Có lỗi được tìm thấy trong file Excel. Vui lòng sửa lại dữ liệu.</template>
                <template v-else>Dữ liệu hợp lệ. Xem trước thống kê và nội dung file bên dưới.</template>
              </p>
            </div>
          </div>

          <div class="card-body mt-4 flex flex-col gap-4">
            <!-- Summary bar -->
            <div
              class="validation-summary"
              :class="validationResult.valid ? 'summary-valid' : 'summary-invalid'"
            >
              <div class="summary-icon">
                <i :class="validationResult.valid ? 'mdi mdi-check-circle' : 'mdi mdi-close-circle'"></i>
              </div>
              <div class="summary-stats">
                <span class="stat-item">
                  Tổng dòng: <strong>{{ validationResult.tongSoDong }}</strong>
                </span>
                <span class="stat-sep">·</span>
                <span class="stat-item text-green-700">
                  Hợp lệ: <strong>{{ validationResult.soDongHopLe }}</strong>
                </span>
                <span class="stat-sep">·</span>
                <span class="stat-item" :class="validationResult.soDongLoi > 0 ? 'text-red-700' : 'text-green-700'">
                  Lỗi: <strong>{{ validationResult.soDongLoi }}</strong>
                </span>
                <span class="stat-sep">·</span>
                <span class="font-bold" :class="validationResult.valid ? 'text-green-800' : 'text-red-800'">
                  {{ validationResult.valid ? '✓ DỮ LIỆU HỢP LỆ' : '✗ CÓ LỖI DỮ LIỆU' }}
                </span>
              </div>
            </div>

            <!-- Error table (only when invalid) -->
            <div v-if="!validationResult.valid && validationResult.errors?.length" class="mt-2 border border-red-200 rounded-lg overflow-hidden">
              <div class="error-table-header p-3 bg-red-50 text-red-900 border-b border-red-200 font-bold flex items-center gap-2">
                <i class="mdi mdi-alert-box-outline"></i>
                Chi tiết lỗi dữ liệu ({{ validationResult.errors.length }} lỗi)
              </div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th style="width: 70px;">Dòng</th>
                      <th style="width: 60px;">Sheet</th>
                      <th style="width: 160px;">Cột dữ liệu</th>
                      <th style="width: 160px;">Giá trị trong file</th>
                      <th>Chi tiết lỗi</th>
                      <th>Gợi ý khắc phục</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(err, idx) in validationResult.errors" :key="idx">
                      <td class="font-bold text-slate-900">{{ err.rowNumber ?? '-' }}</td>
                      <td class="text-slate-500 text-xs">{{ err.sheetName ?? '-' }}</td>
                      <td class="text-red-700 font-semibold">{{ err.columnName }}</td>
                      <td>
                        <code class="value-code">{{ (err.rawValue === null || err.rawValue === '') ? '(trống)' : err.rawValue }}</code>
                      </td>
                      <td class="text-red-600 font-semibold">{{ err.message }}</td>
                      <td class="text-green-700">{{ err.suggestion || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- ── STEP 4: CONFIRM IMPORT ──────────────────────────────────────── -->
        <div
          class="card card-pad animate-fade-in"
          :class="{ 'card-done': phase === 'done', 'card-locked': !validationResult.valid }"
        >
          <div class="card-section-header">
            <div class="step-badge" :class="phase === 'done' ? 'badge-done' : validationResult.valid ? 'badge-active' : 'badge-locked'">
              <i v-if="phase === 'done'" class="mdi mdi-check"></i>
              <span v-else>4</span>
            </div>
            <div>
              <h3 class="section-title">Bước 4: Xác nhận Import dữ liệu</h3>
              <p class="muted mt-0.5">
                <template v-if="!validationResult.valid">Không thể import do dữ liệu file Excel có lỗi. Hãy sửa và kiểm tra lại.</template>
                <template v-else-if="phase === 'done'">Import dữ liệu thành công.</template>
                <template v-else>Nhấn nút bên dưới để tiến hành import chính thức dữ liệu vào hệ thống.</template>
              </p>
            </div>
          </div>

          <!-- Apply result -->
          <div v-if="applyResult" class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-900 animate-fade-in">
            <div class="font-bold mb-2 flex items-center gap-2">
              <i class="mdi mdi-check-circle text-green-600 text-lg"></i>
              Kết quả import thành công:
            </div>
            <ul class="list-disc pl-5 space-y-1">
              <li>Mã import: <strong>{{ applyResult.importId }}</strong></li>
              <li>Trạng thái: <strong class="text-green-700">{{ applyResult.status }}</strong></li>
              <li>Thời gian: <strong>{{ formatDate(applyResult.completedAt) }}</strong></li>
              <li>Tổng dòng xử lý: <strong>{{ applyResult.totalRows }}</strong></li>
              <li>Thành công: <strong class="text-green-700">{{ applyResult.validRows }}</strong></li>
              <li v-if="applyResult.message">Ghi chú: {{ applyResult.message }}</li>
            </ul>
          </div>

          <!-- Action buttons -->
          <div class="mt-4 flex flex-wrap gap-3">
            <button
              v-if="phase !== 'done'"
              id="btn-confirm-import"
              class="btn btn-success"
              :disabled="!canOperate || !validationResult.valid || phase === 'importing'"
              @click="showConfirmDialog = true"
            >
              <i v-if="phase === 'importing'" class="mdi mdi-loading mdi-spin"></i>
              <i v-else class="mdi mdi-database-import-outline"></i>
              {{ phase === 'importing' ? 'Đang import...' : 'Xác nhận Import vào hệ thống' }}
            </button>

            <button class="btn" type="button" @click="handleReset">
              <i class="mdi mdi-refresh"></i>
              Import file khác
            </button>
          </div>
        </div>
      </template>

    </div>

    <!-- Confirm dialog -->
    <ConfirmDialog
      :open="showConfirmDialog"
      title="Xác nhận import dữ liệu"
      message="Thao tác này sẽ ghi chính thức dữ liệu sản phẩm và tồn kho vào hệ thống. Bạn có chắc chắn muốn thực hiện?"
      confirm-text="Đồng ý, Import ngay"
      :loading="phase === 'importing'"
      @cancel="showConfirmDialog = false"
      @confirm="handleConfirmImport"
    />
  </div>
</template>

<style scoped>
/* ── Cards ─────────────────────────────────────────────────────────────── */
.card-done {
  border-left: 4px solid var(--success);
  background-color: #f0fdf4;
}

.card-locked {
  opacity: 0.6;
  border-left: 4px solid var(--border);
  background-color: var(--surface-soft);
}

/* ── Section header ─────────────────────────────────────────────────────── */
.card-section-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.card-body {
  padding-left: 46px;
}

/* ── Step badges ─────────────────────────────────────────────────────────── */
.step-badge {
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
.badge-active { background-color: var(--primary); color: #fff; }
.badge-done   { background-color: var(--success); color: #fff; }
.badge-locked { background-color: var(--border-strong); color: var(--muted); }

/* ── File picker ─────────────────────────────────────────────────────────── */
.file-picker-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}

.file-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

/* ── Alerts ──────────────────────────────────────────────────────────────── */
.alert {
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
}
.alert-error   { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }

/* ── Validation summary bar ──────────────────────────────────────────────── */
.validation-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-radius: 10px;
  border: 1px solid;
}
.summary-valid   { background: #f0fdf4; border-color: #86efac; color: #166534; }
.summary-invalid { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }

.summary-icon { font-size: 22px; flex-shrink: 0; }

.summary-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.stat-sep  { color: #94a3b8; }
.stat-item { }

/* ── Error table ─────────────────────────────────────────────────────────── */
.error-table-header {
  background: #7f1d1d;
  color: #fff;
  padding: 10px 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px 8px 0 0;
  font-size: 14px;
}

.value-code {
  padding: 2px 6px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 12px;
  color: #334155;
}

/* ── Animations ──────────────────────────────────────────────────────────── */
.mdi-spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.animate-fade-in { animation: fadeIn 0.25s ease-out both; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Ghost button variant ────────────────────────────────────────────────── */
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}
.btn-ghost:hover:not(:disabled) {
  background: var(--surface-soft);
}
</style>
