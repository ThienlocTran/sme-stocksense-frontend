<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { getWarehouses } from '../services/warehouseService'
import { getInventory } from '../services/inventoryService'
import { createDraft, updateDraft, getExportReceiptDetails, submitForApproval } from '../services/exportReceiptService'

// Timer ref để cleanup khi component unmount, tránh redirect bất ngờ
let redirectTimer = null

const props = defineProps({
  receiptId: {
    type: [Number, String],
    default: null
  }
})

const router = useRouter()
const isEditMode = computed(() => !!props.receiptId)

// Form State
const isLoading = ref(false)
const isSaving = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const actionMessage = ref('')

const warehouses = ref([])
const availableProducts = ref([]) // Danh sách sản phẩm có tồn kho tại kho xuất

const receipt = reactive({
  warehouseId: '',
  note: '',
  version: null,
  status: 'NHAP'
})

const details = ref([])

// Validate State
const formErrors = reactive({
  warehouseId: '',
  details: ''
})

// Dialog Cảnh báo đổi kho
const confirmWarehouseChange = reactive({
  open: false,
  newWarehouseId: null
})

// Lấy danh sách kho
async function loadWarehouses() {
  try {
    const data = await getWarehouses({ status: 'HOAT_DONG' })
    warehouses.value = Array.isArray(data) ? data : (data.content || [])
  } catch (err) {
    errorMessage.value = 'Không thể tải danh sách kho hàng.'
  }
}

// Lấy danh sách sản phẩm có tồn kho tại kho đã chọn
async function loadAvailableProducts(warehouseId) {
  if (!warehouseId) {
    availableProducts.value = []
    return
  }
  try {
    // Gọi API inventory để biết chính xác kho này đang có sản phẩm gì và tồn bao nhiêu
    const data = await getInventory({ warehouseId, size: 100 })
    // Lọc chỉ lấy những sản phẩm có tồn kho > 0
    availableProducts.value = (data.content || []).filter(item => item.currentQuantity > 0)
  } catch (err) {
    errorMessage.value = 'Không thể tải danh sách tồn kho cho kho này.'
    availableProducts.value = []
  }
}

// Gọi load data ban đầu
onMounted(async () => {
  isLoading.value = true
  await loadWarehouses()
  if (isEditMode.value) {
    await loadReceiptDetails()
  }
  isLoading.value = false
})

async function loadReceiptDetails() {
  try {
    const data = await getExportReceiptDetails(props.receiptId)
    receipt.warehouseId = data.warehouseId || ''
    receipt.note = data.note || ''
    receipt.version = data.version
    receipt.status = data.status
    
    // Load tồn kho cho kho hiện tại
    if (receipt.warehouseId) {
      await loadAvailableProducts(receipt.warehouseId)
    }

    details.value = (data.details || []).map(d => ({
      id: d.id || Date.now() + Math.random(),
      productId: d.productId,
      productName: d.productName,
      unitName: d.unitName,
      quantity: d.quantity,
      note: d.note || '',
      error: '' // để lưu thông báo lỗi local
    }))
  } catch (err) {
    errorMessage.value = err.message || 'Không thể tải chi tiết phiếu xuất.'
    // Hết phiên đăng nhập -> redirect về login
    if (err.status === 401) router.replace('/login')
  }
}

// Xử lý đổi kho
function onWarehouseChange(event) {
  const newId = event.target.value
  
  // Nếu đang có sản phẩm bên dưới thì phải cảnh báo trước khi đổi
  if (details.value.length > 0) {
    // Hiển thị dialog confirm
    confirmWarehouseChange.newWarehouseId = newId
    confirmWarehouseChange.open = true
    
    // Tạm thời revert select box về giá trị cũ trên giao diện
    event.target.value = receipt.warehouseId 
  } else {
    receipt.warehouseId = newId
    loadAvailableProducts(newId)
  }
}

function proceedChangeWarehouse() {
  receipt.warehouseId = confirmWarehouseChange.newWarehouseId
  details.value = [] // Xóa sạch danh sách sản phẩm
  loadAvailableProducts(receipt.warehouseId)
  closeWarehouseConfirm()
}

function cancelChangeWarehouse() {
  closeWarehouseConfirm()
}

function closeWarehouseConfirm() {
  confirmWarehouseChange.open = false
  confirmWarehouseChange.newWarehouseId = null
}

// Logic thao tác Details
function addDetailRow() {
  details.value.push({
    id: Date.now(),
    productId: '',
    quantity: 1,
    note: '',
    error: ''
  })
}

function removeDetailRow(index) {
  details.value.splice(index, 1)
  validateForm()
}

function getProductStock(productId) {
  const p = availableProducts.value.find(item => item.productId === productId)
  return p ? p.currentQuantity : 0
}

function onProductSelect(row) {
  const p = availableProducts.value.find(item => item.productId === row.productId)
  if (p) {
    row.productName = p.productName
    row.unitName = p.unitName
    row.quantity = 1 // reset về 1 khi chọn sản phẩm mới
  }
  validateRow(row)
}

function validateRow(row) {
  if (!row.productId) {
    row.error = 'Vui lòng chọn sản phẩm'
    return false
  }
  if (!row.quantity || row.quantity <= 0) {
    row.error = 'Số lượng phải > 0'
    return false
  }
  const stock = getProductStock(row.productId)
  if (row.quantity > stock) {
    row.error = `Vượt quá tồn kho (Tồn: ${stock})`
    return false
  }
  row.error = ''
  return true
}

function validateForm() {
  let isValid = true
  formErrors.warehouseId = ''
  formErrors.details = ''

  if (!receipt.warehouseId) {
    formErrors.warehouseId = 'Vui lòng chọn kho xuất'
    isValid = false
  }
  if (details.value.length === 0) {
    formErrors.details = 'Vui lòng thêm ít nhất một sản phẩm'
    isValid = false
  }
  
  // Kiểm tra trùng lặp sản phẩm
  const selectedProductIds = new Set()
  let hasDuplicate = false

  details.value.forEach(row => {
    if (!validateRow(row)) isValid = false
    
    if (row.productId) {
      if (selectedProductIds.has(row.productId)) {
        hasDuplicate = true
        row.error = 'Sản phẩm này đã được chọn ở dòng khác'
        isValid = false
      }
      selectedProductIds.add(row.productId)
    }
  })

  if (hasDuplicate) {
    formErrors.details = 'Có sản phẩm bị trùng lặp trong danh sách'
  }

  return isValid
}

function buildPayload() {
  return {
    warehouseId: receipt.warehouseId,
    note: receipt.note,
    version: receipt.version,
    details: details.value.map(d => ({
      productId: d.productId,
      quantity: d.quantity,
      note: d.note
    }))
  }
}

async function saveReceipt() {
  if (!validateForm()) return
  
  isSaving.value = true
  errorMessage.value = ''
  actionMessage.value = ''
  
  try {
    const payload = buildPayload()
    if (isEditMode.value) {
      await updateDraft(props.receiptId, payload)
      actionMessage.value = 'Cập nhật phiếu xuất nháp thành công!'
    } else {
      await createDraft(payload)
      actionMessage.value = 'Tạo phiếu xuất nháp thành công!'
    }
    
    // Điều hướng liền mạch về trang danh sách (cleanup timer cũ trước)
    if (redirectTimer) clearTimeout(redirectTimer)
    redirectTimer = setTimeout(() => { router.push('/stock-out') }, 1000)
    
  } catch (err) {
    errorMessage.value = err.message || 'Có lỗi xảy ra khi lưu.'
    if (err.status === 401) router.replace('/login')
  } finally {
    isSaving.value = false
  }
}

async function saveAndSubmit() {
  if (!validateForm()) return
  
  isSubmitting.value = true
  errorMessage.value = ''
  actionMessage.value = ''
  
  try {
    const payload = buildPayload()
    let receiptIdToSubmit = props.receiptId

    // Nếu tạo mới thì phải tạo nháp trước
    if (!isEditMode.value) {
      const draftRes = await createDraft(payload)
      receiptIdToSubmit = draftRes.id
      try {
        // Submit với version từ response của createDraft
        await submitForApproval(receiptIdToSubmit, { version: draftRes.version ?? 0 })
      } catch (submitErr) {
        // Nháp đã tạo thành công nhưng submit thất bại:
        // Điều hướng sang trang Sửa phiếu để user xử lý tiếp, tránh tạo thêm nháp trùng
        errorMessage.value = (submitErr.message || 'Gửi duyệt thất bại.') + ' Phiếu nháp đã được lưu, bạn có thể gửi duyệt lại.'
        if (submitErr.status === 401) router.replace('/login')
        else router.replace(`/stock-out/${receiptIdToSubmit}/edit`)
        return
      }
    } else {
      // Sửa nháp trước rồi submit
      const updateRes = await updateDraft(props.receiptId, payload)
      await submitForApproval(receiptIdToSubmit, { version: updateRes.version })
    }
    
    actionMessage.value = 'Lưu và gửi duyệt thành công!'
    
    // Điều hướng liền mạch về trang danh sách (cleanup timer cũ trước)
    if (redirectTimer) clearTimeout(redirectTimer)
    redirectTimer = setTimeout(() => { router.push('/stock-out') }, 1000)
    
  } catch (err) {
    errorMessage.value = err.message || 'Có lỗi xảy ra khi gửi duyệt.'
    if (err.status === 401) router.replace('/login')
  } finally {
    isSubmitting.value = false
  }
}

function goBack() {
  if (redirectTimer) clearTimeout(redirectTimer)
  router.push('/stock-out')
}

// Cleanup timer khi component bị destroy
onUnmounted(() => {
  if (redirectTimer) clearTimeout(redirectTimer)
})
</script>

<template>
  <div class="card card-pad form-container">
    <div v-if="isLoading" class="loading-state">
      Đang tải dữ liệu phiếu xuất...
    </div>
    
    <div v-else>
      <h2 class="form-title">{{ isEditMode ? 'Chỉnh sửa Phiếu xuất' : 'Tạo Phiếu xuất mới' }}</h2>
      
      <p v-if="errorMessage" class="form-alert form-alert-error">{{ errorMessage }}</p>
      <p v-if="actionMessage" class="form-alert form-alert-success">{{ actionMessage }}</p>

      <!-- Header Form -->
      <div class="form-grid">
        <div class="form-group">
          <label>Kho xuất <span class="required">*</span></label>
          <select 
            :value="receipt.warehouseId" 
            @change="onWarehouseChange"
            class="input-control" 
            :class="{'has-error': formErrors.warehouseId}"
            :disabled="isSaving || isSubmitting"
          >
            <option value="">-- Chọn kho xuất --</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
          <span v-if="formErrors.warehouseId" class="error-text">{{ formErrors.warehouseId }}</span>
        </div>

        <div class="form-group">
          <label>Ghi chú</label>
          <textarea 
            v-model="receipt.note" 
            class="input-control" 
            rows="2" 
            placeholder="Lý do xuất kho (tùy chọn)"
            :disabled="isSaving || isSubmitting"
          ></textarea>
        </div>
      </div>

      <hr class="divider" />

      <!-- Details List -->
      <div class="details-section">
        <div class="details-header">
          <h3>Danh sách Sản phẩm xuất</h3>
          <button type="button" class="btn btn-sm btn-outline" @click="addDetailRow" :disabled="!receipt.warehouseId">
            <i class="mdi mdi-plus"></i> Thêm dòng
          </button>
        </div>
        
        <p v-if="!receipt.warehouseId" class="muted text-sm">Vui lòng chọn Kho xuất trước khi thêm sản phẩm.</p>
        <p v-if="formErrors.details" class="form-alert form-alert-error compact">{{ formErrors.details }}</p>

        <div class="table-responsive" v-if="details.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th width="35%">Sản phẩm <span class="required">*</span></th>
                <th width="15%">Tồn kho</th>
                <th width="20%">SL xuất <span class="required">*</span></th>
                <th width="25%">Ghi chú</th>
                <th width="5%"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in details" :key="row.id">
                <td>
                  <select v-model="row.productId" class="input-control input-sm" @change="onProductSelect(row)" :class="{'has-error': row.error && !row.productId}">
                    <option value="">-- Chọn sản phẩm --</option>
                    <option v-for="p in availableProducts" :key="p.productId" :value="p.productId">
                      {{ p.productName }} ({{ p.productCode }})
                    </option>
                  </select>
                </td>
                <td>
                  <span class="stock-badge" v-if="row.productId">{{ getProductStock(row.productId) }} {{ row.unitName }}</span>
                  <span class="muted" v-else>-</span>
                </td>
                <td>
                  <div class="input-with-error">
                    <input 
                      type="number" 
                      v-model.number="row.quantity" 
                      class="input-control input-sm" 
                      min="1" 
                      @input="validateRow(row)"
                      :class="{'has-error': row.error}"
                    />
                    <span v-if="row.error" class="inline-error">{{ row.error }}</span>
                  </div>
                </td>
                <td>
                  <input type="text" v-model="row.note" class="input-control input-sm" placeholder="Ghi chú thêm" />
                </td>
                <td class="text-center">
                  <button type="button" class="btn-icon text-danger" @click="removeDetailRow(index)" title="Xóa dòng">
                    <i class="mdi mdi-delete"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" @click="goBack" :disabled="isSaving || isSubmitting">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" @click="saveReceipt" :disabled="isSaving || isSubmitting || !receipt.warehouseId">
          {{ isSaving ? 'Đang lưu...' : 'Lưu nháp' }}
        </button>
        <button type="button" class="btn btn-success" @click="saveAndSubmit" :disabled="isSaving || isSubmitting || !receipt.warehouseId">
          {{ isSubmitting ? 'Đang xử lý...' : 'Lưu & Gửi duyệt' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Popup Xác nhận Đổi kho -->
  <ConfirmDialog
    :open="confirmWarehouseChange.open"
    title="Cảnh báo thay đổi Kho xuất"
    message="Việc thay đổi Kho xuất sẽ xóa sạch toàn bộ danh sách sản phẩm bạn đã chọn bên dưới (do tồn kho khác nhau). Bạn có chắc chắn muốn đổi không?"
    confirm-text="Đồng ý, đổi kho"
    cancel-text="Không, giữ nguyên"
    danger
    @confirm="proceedChangeWarehouse"
    @cancel="cancelChangeWarehouse"
  />
</template>

<style scoped>
/* @design-taste-frontend: Premium Aesthetics */
.navigation-bar {
  margin-bottom: 16px;
}
.btn-back {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--color-text-secondary); font-weight: 600; padding: 6px 12px;
  border-radius: 8px; transition: all 0.2s ease;
}
.btn-back:hover { color: var(--color-text-primary); background: var(--color-btn-hover-bg); transform: translateX(-2px); }

.form-container {
  max-width: 1000px;
  margin: 0 auto;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05);
  transition: box-shadow 0.3s ease;
}
.form-container:hover {
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05);
}

.form-title { font-size: 20px; font-weight: 700; color: var(--color-text-primary); margin: 0 0 24px; letter-spacing: -0.02em; }

.form-grid {
  display: grid; grid-template-columns: 1fr 2fr; gap: 24px;
}
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; gap: 16px; }
}

.form-group label { display: block; margin-bottom: 6px; font-weight: 600; color: var(--color-text-secondary); font-size: 14px; }
.required { color: var(--color-danger); }
.input-control {
  width: 100%; padding: 10px 12px; border: 1px solid var(--color-border-strong); border-radius: 8px;
  font-size: 14px; color: var(--color-text-primary); background: var(--color-surface);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.input-control:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-soft); }
.input-control.has-error { border-color: var(--color-danger); background: var(--color-danger-soft); }
.input-control.has-error:focus { box-shadow: 0 0 0 3px var(--color-danger-soft); }

.error-text { display: block; margin-top: 6px; color: var(--color-danger); font-size: 13px; font-weight: 500; }
.inline-error { display: block; margin-top: 4px; color: var(--color-danger); font-size: 12px; font-weight: 600; }

.divider { margin: 32px 0; border: 0; height: 1px; background: var(--color-border); }

.details-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.details-header h3 { font-size: 16px; font-weight: 700; color: var(--color-text-primary); margin: 0; }

.data-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.data-table th { background: var(--color-bg); padding: 10px 12px; text-align: left; font-size: 13px; color: var(--color-text-secondary); font-weight: 600; border-bottom: 1px solid var(--color-border); }
.data-table td { padding: 12px; border-bottom: 1px solid var(--color-border); vertical-align: top; }

.input-sm { padding: 8px 10px; font-size: 13px; }

.stock-badge {
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-success-soft); color: var(--color-success); border: 1px solid var(--color-success);
  padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; white-space: nowrap;
}

.btn-icon {
  background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px;
  color: var(--color-text-muted); transition: all 0.2s ease;
}
.btn-icon:hover { background: var(--color-danger-soft); color: var(--color-danger); transform: scale(1.05); }

.form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--color-border); }
.btn {
  padding: 10px 18px; font-weight: 600; font-size: 14px; border-radius: 8px; border: none;
  cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.btn:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-primary { background: var(--color-primary); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn-success { background: var(--color-success); color: #fff; }
.btn-success:hover:not(:disabled) { background: var(--color-brand-hover); }
.btn-outline { background: transparent; border: 1px solid var(--color-border-strong); color: var(--color-text-secondary); }
.btn-outline:hover:not(:disabled) { border-color: var(--color-border-strong); color: var(--color-text-primary); background: var(--color-btn-hover-bg); }

.form-alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
.form-alert.compact { padding: 8px 12px; margin-bottom: 12px; }
.form-alert-error { background: var(--color-danger-soft); color: var(--color-danger); border: 1px solid var(--color-danger); }
.form-alert-success { background: var(--color-success-soft); color: var(--color-success); border: 1px solid var(--color-success); }
</style>
