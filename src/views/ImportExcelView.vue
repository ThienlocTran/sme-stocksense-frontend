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
    warehouseError.value = error.message || t('importExcel.messages.loadWarehouseError')
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
    globalError.value = error.message || t('importExcel.messages.downloadTemplateError')
    if (error.status === 401) router.replace('/login')
  } finally {
    isDownloadingTemplate.value = false
  }
}

// ─── Step 1: Upload & Validate (single call) ──────────────────────────────────
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
    globalSuccess.value = t('importExcel.messages.importSuccess', { count: result.validRows ?? result.totalRows })
  } catch (error) {
    globalError.value = error.message || t('importExcel.messages.importFailed')
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
      :title="t('importExcel.title')"
      :description="t('importExcel.description')"
    />

    <!-- Global messages -->
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

    <div class="mt-6 flex flex-col gap-5">

      <!-- ── STEP 1: CONFIG & TEMPLATE ─────────────────────────────────────── -->
      <div class="card card-pad" :class="{ 'card-done': phase === 'done' || validationResult }">
        <div class="card-section-header">
          <div class="step-badge" :class="phase === 'done' || validationResult ? 'badge-done' : 'badge-active'">
            <i v-if="phase === 'done' || validationResult" class="mdi mdi-check"></i>
            <span v-else>1</span>
          </div>
          <div>
            <h3 class="section-title">{{ t("importExcel.step1.title") }}</h3>
            <p class="muted mt-0.5">{{ t("importExcel.step1.desc") }}</p>
          </div>
        </div>

        <div class="card-body mt-4 flex flex-col gap-4">
          <!-- Row: Import type + Warehouse -->
          <div class="grid grid-2 gap-4">
            <div class="field">
              <label class="field-label">{{ t("importExcel.step1.importTypeLabel") }}</label>
              <select
                v-model="importType"
                class="select"
                :disabled="phase === 'validating' || phase === 'importing' || phase === 'done'"
              >
                <option value="PRODUCT_ONLY">{{ t("importExcel.step1.typeProductOnly") }}</option>
                <option value="PRODUCT_WITH_OPENING_STOCK">{{ t("importExcel.step1.typeProductWithStock") }}</option>
              </select>
              <span class="text-xs text-[var(--color-text-secondary)] mt-1 block">
                {{ importType === 'PRODUCT_ONLY' 
                  ? t('importExcel.step1.typeProductOnlyDesc') 
                  : t('importExcel.step1.typeProductWithStockDesc') }}
              </span>
            </div>

            <div v-if="importType === 'PRODUCT_WITH_OPENING_STOCK'" class="field">
              <label class="field-label">{{ t("importExcel.step1.warehouseLabel") }}</label>
              <select
                v-model="selectedWarehouseId"
                class="select"
                :disabled="isLoadingWarehouses || phase === 'validating' || phase === 'importing' || phase === 'done'"
              >
                <option value="">{{ t("importExcel.step1.warehousePlaceholder") }}</option>
                <option v-for="w in warehouses" :key="w.id" :value="w.id">
                  {{ w.tenKho }} ({{ w.maKho }})
                </option>
              </select>
              <span class="text-xs text-[var(--color-text-secondary)] mt-1 block">
                {{ t("importExcel.step1.warehouseDesc") }}
              </span>
              <small v-if="isLoadingWarehouses" class="text-slate-400">{{ t("importExcel.step1.loadingWarehouses") }}</small>
              <small v-if="warehouseError" class="text-red-600 font-semibold mt-1 block">{{ warehouseError }}</small>
            </div>
          </div>

          <!-- Download template button unconditional -->
          <div class="flex items-center gap-3 mt-2">
            <button class="btn btn-ghost" type="button" :disabled="isDownloadingTemplate" @click="handleDownloadTemplate">
              <i v-if="isDownloadingTemplate" class="mdi mdi-loading mdi-spin"></i>
              <i v-else class="mdi mdi-download-outline"></i>
              {{ t("importExcel.step1.downloadTemplateBtn") }}
            </button>
            <span class="text-xs text-slate-500">{{ t("importExcel.step1.downloadTemplateDesc") }}</span>
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
            <h3 class="section-title">{{ t("importExcel.step2.title") }}</h3>
            <p class="muted mt-0.5">{{ t("importExcel.step2.desc") }}</p>
          </div>
        </div>

        <div class="card-body mt-4 flex flex-col gap-4">
          <div v-if="!canOperate" class="alert alert-error mb-2">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>{{ t("importExcel.step2.noPermission") }}</span>
          </div>

          <!-- File picker row -->
          <div class="field">
            <label>{{ t("importExcel.step2.fileLabel") }}</label>
            <div class="file-picker-row">
              <button
                class="btn btn-secondary"
                type="button"
                :disabled="!canOperate || phase === 'validating' || phase === 'importing' || phase === 'done'"
                @click="fileInput.click()"
              >
                <i class="mdi mdi-file-excel-outline"></i>
                {{ t("importExcel.step2.selectFileBtn") }}
              </button>
              <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="onFileChange" />

              <div v-if="selectedFile" class="file-badge">
                <i class="mdi mdi-file-check-outline text-green-600"></i>
                <span>{{ selectedFile.name }} <span class="text-slate-400">({{ formatFileSize(selectedFile.size) }})</span></span>
              </div>
              <span v-else class="text-sm text-slate-400">{{ t("importExcel.step2.noFileSelected") }}</span>
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
              {{ phase === 'validating' ? t('importExcel.step2.validatingBtn') : t('importExcel.step2.uploadValidateBtn') }}
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
              <h3 class="section-title">{{ t("importExcel.step3.title") }}</h3>
              <p class="muted mt-0.5">
                <template v-if="!validationResult.valid">{{ t("importExcel.step3.descInvalid") }}</template>
                <template v-else>{{ t("importExcel.step3.descValid") }}</template>
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
                  {{ t("importExcel.step3.statsTotalRows") }}: <strong>{{ validationResult.tongSoDong }}</strong>
                </span>
                <span class="stat-sep">·</span>
                <span class="stat-item text-green-700">
                  {{ t("importExcel.step3.statsValidRows") }}: <strong>{{ validationResult.soDongHopLe }}</strong>
                </span>
                <span class="stat-sep">·</span>
                <span class="stat-item" :class="validationResult.soDongLoi > 0 ? 'text-red-700' : 'text-green-700'">
                  {{ t("importExcel.step3.statsErrorRows") }}: <strong>{{ validationResult.soDongLoi }}</strong>
                </span>
                <span class="stat-sep">·</span>
                <span class="font-bold" :class="validationResult.valid ? 'text-green-800' : 'text-red-800'">
                  {{ validationResult.valid ? t('importExcel.step3.statusValid') : t('importExcel.step3.statusInvalid') }}
                </span>
              </div>
            </div>

            <!-- Error table (only when invalid) -->
            <div v-if="!validationResult.valid && validationResult.errors?.length" class="mt-2 border border-red-200 rounded-lg overflow-hidden">
              <div class="error-table-header p-3 bg-red-50 text-red-900 border-b border-red-200 font-bold flex items-center gap-2">
                <i class="mdi mdi-alert-box-outline"></i>
                {{ t("importExcel.step3.errorDetailsTitle", { count: validationResult.errors.length }) }}
              </div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th style="width: 70px;">Dòng</th>
                      <th style="width: 60px;">Sheet</th>
                      <th style="width: 160px;">Cột dữ liệu</th>
                      <th style="width: 160px;">Giá trị trong file</th>
                      <th>{{ t("importExcel.step3.colErrorDetail") }}</th>
                      <th>{{ t("importExcel.step3.colSuggestion") }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(err, idx) in validationResult.errors" :key="idx">
                      <td class="font-bold text-slate-900">{{ err.rowNumber ?? '-' }}</td>
                      <td class="text-slate-500 text-xs">{{ err.sheetName ?? '-' }}</td>
                      <td class="text-red-700 font-semibold">{{ err.columnName }}</td>
                      <td>
                        <code class="value-code">{{ (err.rawValue === null || err.rawValue === '') ? t('importExcel.step3.emptyValue') : err.rawValue }}</code>
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
              <h3 class="section-title">{{ t("importExcel.step4.title") }}</h3>
              <p class="muted mt-0.5">
                <template v-if="!validationResult.valid">{{ t("importExcel.step4.descInvalid") }}</template>
                <template v-else-if="phase === 'done'">{{ t("importExcel.step4.descSuccess") }}</template>
                <template v-else>{{ t("importExcel.step4.descReady") }}</template>
              </p>
            </div>
          </div>

          <!-- Apply result -->
          <div v-if="applyResult" class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-900 animate-fade-in">
            <div class="font-bold mb-2 flex items-center gap-2">
              <i class="mdi mdi-check-circle text-green-600 text-lg"></i>
              {{ t("importExcel.step4.resultTitle") }}
            </div>
            <ul class="list-disc pl-5 space-y-1">
              <li>{{ t("importExcel.step4.importId") }}: <strong>{{ applyResult.importId }}</strong></li>
              <li>{{ t("importExcel.step4.status") }}: <strong class="text-green-700">{{ applyResult.status }}</strong></li>
              <li>{{ t("importExcel.step4.time") }}: <strong>{{ formatDate(applyResult.completedAt) }}</strong></li>
              <li>{{ t("importExcel.step4.totalProcessed") }}: <strong>{{ applyResult.totalRows }}</strong></li>
              <li>{{ t("importExcel.step4.successProcessed") }}: <strong class="text-green-700">{{ applyResult.validRows }}</strong></li>
              <li v-if="applyResult.message">{{ t("importExcel.step4.note") }}: {{ applyResult.message }}</li>
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
              {{ phase === 'importing' ? t('importExcel.step4.importingBtn') : t('importExcel.step4.confirmBtn') }}
            </button>

            <button class="btn" type="button" @click="handleReset">
              <i class="mdi mdi-refresh"></i>
              {{ t("importExcel.step4.importAnotherBtn") }}
            </button>
          </div>
        </div>
      </template>

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
