<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()
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
const phase = ref('idle') 

// Validation result
const validationResult = ref(null)
const importId = ref(null)
const applyResult = ref(null)

const showConfirmDialog = ref(false)
const globalError = ref('')
const globalSuccess = ref('')

async function fetchWarehouseList() {
  isLoadingWarehouses.value = true
  warehouseError.value = ''
  try {
    const list = await getWarehouses({ status: 'HOAT_DONG' })
    warehouses.value = list || []
  } catch (error) {
    warehouseError.value = error.message || t('importExcel.messages.loadWarehouseError')
  } finally {
    isLoadingWarehouses.value = false
  }
}

onMounted(() => { fetchWarehouseList() })

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
    fileError.value = t('importExcel.messages.invalidFileType')
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
    globalError.value = error.message || t('importExcel.messages.downloadTemplateError')
    if (error.status === 401) router.replace('/login')
  } finally {
    isDownloadingTemplate.value = false
  }
}

async function handleUploadAndValidate() {
  if (!selectedFile.value) { fileError.value = t('importExcel.messages.selectFileFirst'); return }

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
      globalSuccess.value = t('importExcel.messages.allRowsValid', { count: result.tongSoDong })
    } else {
      globalError.value = t('importExcel.messages.hasErrors', { count: result.soDongLoi })
    }
  } catch (error) {
    globalError.value = error.message || t('importExcel.messages.validateError')
    if (error.status === 401) router.replace('/login')
    phase.value = 'idle'
  }
}

async function handleConfirmImport() {
  showConfirmDialog.value = false
  if (!selectedFile.value || !validationResult.value?.valid) return

  phase.value = 'importing'
  globalError.value = ''
  globalSuccess.value = ''

  try {
    const session = await createImportSession(
      selectedFile.value,
      importType.value,
      selectedWarehouseId.value || null
    )
    importId.value = session.id

    await confirmImportSession(session.id)

    const result = await applyImportSession(session.id, selectedFile.value)
    applyResult.value = result
    phase.value = 'done'
    globalSuccess.value = t('importExcel.messages.importSuccess', { count: result.validRows ?? result.totalRows })
  } catch (error) {
    globalError.value = error.message || t('importExcel.messages.importFailed')
    if (error.status === 401) router.replace('/login')
    phase.value = 'validated'
  }
}

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
  <div class="page-container page-shell">
    <PageHeader
      :title="t('importExcel.title')"
      :description="t('importExcel.description')"
    />

    <!-- Global alert messages -->
    <div class="mt-4 flex flex-col gap-2">
      <div v-if="globalError" class="alert alert-error animate-fade-in">
        <i class="mdi mdi-alert-circle-outline text-lg"></i>
        <div><span class="font-bold">{{ t("importExcel.alerts.error") }}: </span>{{ globalError }}</div>
      </div>
      <div v-if="globalSuccess" class="alert alert-success animate-fade-in">
        <i class="mdi mdi-check-circle-outline text-lg"></i>
        <div><span class="font-bold">{{ t("importExcel.alerts.success") }}: </span>{{ globalSuccess }}</div>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Left side: Configuration & Selection -->
      <div class="lg:col-span-1 space-y-6">
        <div class="card card-pad">
          <h3 class="text-base font-bold mb-4 text-zinc-900 dark:text-zinc-50 border-b pb-2">
            {{ t('importExcel.step1.title') }}
          </h3>

          <div class="space-y-4">
            <!-- Import Type -->
            <div class="field">
              <label class="field-label">{{ t("importExcel.step1.importTypeLabel") }}</label>
              <select
                v-model="importType"
                class="select w-full"
                :disabled="phase === 'validating' || phase === 'importing' || phase === 'done'"
              >
                <option value="PRODUCT_ONLY">{{ t("importExcel.step1.typeProductOnly") }}</option>
                <option value="PRODUCT_WITH_OPENING_STOCK">{{ t("importExcel.step1.typeProductWithStock") }}</option>
              </select>
              <span class="text-xs text-zinc-500 mt-1 block">
                {{ importType === 'PRODUCT_ONLY' 
                  ? t('importExcel.step1.typeProductOnlyDesc') 
                  : t('importExcel.step1.typeProductWithStockDesc') }}
              </span>
            </div>

            <!-- Warehouse Selection -->
            <div v-if="importType === 'PRODUCT_WITH_OPENING_STOCK'" class="field pt-2">
              <label class="field-label">{{ t("importExcel.step1.warehouseLabel") }}</label>
              <select
                v-model="selectedWarehouseId"
                class="select w-full"
                :disabled="isLoadingWarehouses || phase === 'validating' || phase === 'importing' || phase === 'done'"
              >
                <option value="">{{ t("importExcel.step1.warehousePlaceholder") }}</option>
                <option v-for="w in warehouses" :key="w.id" :value="w.id">
                  {{ w.tenKho }} ({{ w.maKho }})
                </option>
              </select>
              <span class="text-xs text-zinc-500 mt-1 block">
                {{ t("importExcel.step1.warehouseDesc") }}
              </span>
              <small v-if="isLoadingWarehouses" class="text-slate-400 block mt-1">{{ t("importExcel.step1.loadingWarehouses") }}</small>
              <small v-if="warehouseError" class="text-red-600 font-semibold mt-1 block">{{ warehouseError }}</small>
            </div>

            <!-- Template download -->
            <div class="border-t pt-4 flex flex-col gap-2">
              <button 
                class="btn btn-ghost w-full justify-start" 
                type="button" 
                :disabled="isDownloadingTemplate" 
                @click="handleDownloadTemplate"
              >
                <i v-if="isDownloadingTemplate" class="mdi mdi-loading mdi-spin mr-1"></i>
                <i v-else class="mdi mdi-download-outline mr-1"></i>
                <span>{{ t("importExcel.step1.downloadTemplateBtn") }}</span>
              </button>
              <span class="text-xs text-zinc-500 pl-2">{{ t("importExcel.step1.downloadTemplateDesc") }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right side: File upload, Validate and Results -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- File upload panel -->
        <div class="card card-pad">
          <h3 class="text-base font-bold mb-4 text-zinc-900 dark:text-zinc-50 border-b pb-2">
            {{ t('importExcel.step2.title') || 'Chọn tệp dữ liệu' }}
          </h3>

          <div v-if="!canOperate" class="alert alert-error mb-4">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>{{ t("importExcel.step2.noPermission") }}</span>
          </div>

          <div class="space-y-6">
            <!-- Dropzone or selection row -->
            <div class="flex items-center gap-4">
              <button
                class="btn btn-secondary"
                type="button"
                :disabled="!canOperate || phase === 'validating' || phase === 'importing' || phase === 'done'"
                @click="fileInput.click()"
              >
                <i class="mdi mdi-file-excel-outline mr-1"></i>
                {{ t("importExcel.step2.selectFileBtn") }}
              </button>
              <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="onFileChange" />

              <div v-if="selectedFile" class="file-badge">
                <i class="mdi mdi-file-check-outline text-green-600"></i>
                <span class="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                  {{ selectedFile.name }} <span class="text-xs text-zinc-400 font-normal">({{ formatFileSize(selectedFile.size) }})</span>
                </span>
              </div>
              <span v-else class="text-sm text-zinc-400 italic">{{ t("importExcel.step2.noFileSelected") }}</span>
            </div>
            <small v-if="fileError" class="text-red-600 font-semibold block mt-1">{{ fileError }}</small>

            <!-- Validate & Confirm import buttons -->
            <div class="flex items-center gap-3 border-t pt-4">
              <button
                class="btn btn-primary"
                :disabled="!canOperate || !selectedFile || phase === 'validating' || phase === 'importing' || phase === 'done'"
                @click="handleUploadAndValidate"
              >
                <i v-if="phase === 'validating'" class="mdi mdi-loading mdi-spin mr-1"></i>
                <i v-else class="mdi mdi-upload-outline mr-1"></i>
                <span>{{ phase === 'validating' ? t('importExcel.step2.validatingBtn') : (t('importExcel.step2.uploadValidateBtn') || 'Kiểm tra dữ liệu') }}</span>
              </button>

              <button
                v-if="validationResult && validationResult.valid && phase !== 'done'"
                class="btn btn-success text-white"
                :disabled="!canOperate || phase === 'importing'"
                @click="showConfirmDialog = true"
              >
                <i v-if="phase === 'importing'" class="mdi mdi-loading mdi-spin mr-1"></i>
                <i v-else class="mdi mdi-database-import-outline mr-1"></i>
                <span>{{ phase === 'importing' ? t('importExcel.step4.importingBtn') : (t('importExcel.step4.confirmBtn') || 'Nhập dữ liệu') }}</span>
              </button>

              <button 
                v-if="phase === 'done' || validationResult" 
                class="btn btn-ghost" 
                type="button" 
                @click="handleReset"
              >
                <i class="mdi mdi-refresh mr-1"></i>
                <span>{{ t("importExcel.step4.importAnotherBtn") }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Session Result (Success detail info) -->
        <div v-if="applyResult" class="card card-pad bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800/30">
          <h3 class="text-base font-bold mb-3 text-green-900 dark:text-green-400 flex items-center gap-2">
            <i class="mdi mdi-check-circle text-green-600"></i>
            {{ t("importExcel.step4.resultTitle") }}
          </h3>
          <ul class="text-sm space-y-2 text-zinc-700 dark:text-zinc-300 font-medium">
            <li>{{ t("importExcel.step4.importId") }}: <span class="font-mono text-zinc-900 dark:text-zinc-100 font-bold">{{ applyResult.importId }}</span></li>
            <li>{{ t("importExcel.step4.status") }}: <span class="text-green-700 dark:text-green-400 font-bold">{{ applyResult.status }}</span></li>
            <li>{{ t("importExcel.step4.time") }}: <span class="text-zinc-900 dark:text-zinc-100 font-bold">{{ formatDate(applyResult.completedAt) }}</span></li>
            <li>{{ t("importExcel.step4.totalProcessed") }}: <span class="text-zinc-900 dark:text-zinc-100 font-bold">{{ applyResult.totalRows }}</span></li>
            <li>{{ t("importExcel.step4.successProcessed") }}: <span class="text-green-700 dark:text-green-400 font-bold">{{ applyResult.validRows }}</span></li>
            <li v-if="applyResult.message">{{ t("importExcel.step4.note") }}: {{ applyResult.message }}</li>
          </ul>
        </div>

        <!-- Validation errors detail table -->
        <div v-if="validationResult" class="card">
          <div class="card-header border-b px-6 py-4 flex items-center justify-between"
               :class="validationResult.valid ? 'bg-green-50/30 border-green-200 dark:bg-green-950/10 dark:border-green-800/20' : 'bg-red-50/30 border-red-200 dark:bg-red-950/10 dark:border-red-800/20'">
            <h3 class="text-base font-bold flex items-center gap-2"
                :class="validationResult.valid ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'">
              <i :class="validationResult.valid ? 'mdi mdi-check-circle' : 'mdi mdi-alert-circle'"></i>
              <span>{{ validationResult.valid ? t('importExcel.step3.statusValid') : t('importExcel.step3.title') }}</span>
            </h3>
            
            <div class="text-sm font-semibold text-zinc-600 dark:text-zinc-400 space-x-4">
              <span>{{ t("importExcel.step3.statsTotalRows") }}: <strong>{{ validationResult.tongSoDong }}</strong></span>
              <span>|</span>
              <span class="text-green-600">{{ t("importExcel.step3.statsValidRows") }}: <strong>{{ validationResult.soDongHopLe }}</strong></span>
              <span v-if="validationResult.soDongLoi > 0">|</span>
              <span v-if="validationResult.soDongLoi > 0" class="text-red-600">{{ t("importExcel.step3.statsErrorRows") }}: <strong>{{ validationResult.soDongLoi }}</strong></span>
            </div>
          </div>

          <!-- Discrepancies/Errors Table -->
          <div v-if="!validationResult.valid && validationResult.errors?.length" class="overflow-x-auto">
            <table class="table min-w-full">
              <thead>
                <tr class="border-b bg-zinc-50/20 dark:bg-zinc-800/10">
                  <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider" style="width: 70px;">Dòng</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider" style="width: 60px;">Sheet</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider" style="width: 150px;">Cột dữ liệu</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider" style="width: 120px;">Giá trị tệp</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t("importExcel.step3.colErrorDetail") }}</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t("importExcel.step3.colSuggestion") }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                <tr v-for="(err, idx) in validationResult.errors" :key="idx" class="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10">
                  <td class="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">{{ err.rowNumber ?? '-' }}</td>
                  <td class="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{{ err.sheetName ?? '-' }}</td>
                  <td class="px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400">{{ err.columnName }}</td>
                  <td class="px-4 py-3 text-sm">
                    <code class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-zinc-700 dark:text-zinc-300 text-xs">
                      {{ (err.rawValue === null || err.rawValue === '') ? t('importExcel.step3.emptyValue') : err.rawValue }}
                    </code>
                  </td>
                  <td class="px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">{{ err.message }}</td>
                  <td class="px-4 py-3 text-sm text-green-600 dark:text-green-400 font-medium">{{ err.suggestion || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>

    <!-- Confirm dialog -->
    <ConfirmDialog
      :open="showConfirmDialog"
      :title="t('importExcel.confirmDialog.title')"
      :message="t('importExcel.confirmDialog.message')"
      :confirm-text="t('importExcel.confirmDialog.confirmBtn')"
      :loading="phase === 'importing'"
      @cancel="showConfirmDialog = false"
      @confirm="handleConfirmImport"
    />
  </div>
</template>

<style scoped>
.file-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}
.alert {
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
}
.alert-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
.alert-success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  color: #22c55e;
}
.mdi-spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
