<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import FeaturePending from '../components/FeaturePending.vue'
import { createImportReceipt, getProducts, getSuppliers, getWarehouses, saveDraft } from '../services/importReceiptService'

const props = defineProps({
  type: { type: String, default: 'in' },
  id: { type: String, default: '' },
  mode: { type: String, default: 'create' },
})

const router = useRouter()
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const warehouses = ref([])
const suppliers = ref([])
const products = ref([])

const loadingState = reactive({
  warehouses: false,
  suppliers: false,
  products: false,
})

const errorState = reactive({
  warehouses: '',
  suppliers: '',
  products: '',
})

const form = reactive({
  warehouseId: null,
  supplierId: null,
  note: '',
})

const itemDraft = reactive({
  productId: null,
  quantity: 1,
  unitPrice: 0,
  note: '',
})

const items = ref([])
const formErrors = reactive({ warehouseId: '', supplierId: '', note: '' })
const itemErrors = reactive({ productId: '', quantity: '', unitPrice: '' })

const isCreateMode = computed(() => props.mode === 'create')
const isEditMode = computed(() => props.mode === 'edit')
const pageTitle = computed(() => {
  if (props.type === 'out') return isEditMode.value ? 'Sửa phiếu xuất kho' : 'Tạo phiếu xuất kho'
  return isEditMode.value ? 'Sửa phiếu nhập kho' : 'Tạo phiếu nhập kho'
})

onMounted(async () => {
  if (props.type === 'in' && isCreateMode.value) {
    await loadDropdowns()
  }
})

async function loadDropdowns() {
  isLoading.value = true
  errorMessage.value = ''
  errorState.warehouses = ''
  errorState.suppliers = ''
  errorState.products = ''

  const results = await Promise.allSettled([
    getWarehouses(),
    getSuppliers(),
    getProducts(),
  ])

  const [whResult, suppResult, prodResult] = results

  if (whResult.status === 'fulfilled') {
    warehouses.value = whResult.value
    if (whResult.value.length === 0) {
      errorState.warehouses = 'Không có kho nào đang hoạt động.'
    }
  } else {
    errorState.warehouses = whResult.reason?.message || 'Không thể tải danh sách kho.'
    if (whResult.reason?.status === 401) router.replace('/login')
  }

  if (suppResult.status === 'fulfilled') {
    suppliers.value = suppResult.value
    if (suppResult.value.length === 0) {
      errorState.suppliers = 'Không có nhà cung cấp nào đang hoạt động.'
    }
  } else {
    errorState.suppliers = suppResult.reason?.message || 'Không thể tải danh sách nhà cung cấp.'
    if (suppResult.reason?.status === 401) router.replace('/login')
  }

  if (prodResult.status === 'fulfilled') {
    products.value = prodResult.value
    if (prodResult.value.length === 0) {
      errorState.products = 'Không có sản phẩm nào đang hoạt động.'
    }
  } else {
    errorState.products = prodResult.reason?.message || 'Không thể tải danh sách sản phẩm.'
    if (prodResult.reason?.status === 401) router.replace('/login')
  }

  isLoading.value = false

  const hasAnyError = errorState.warehouses || errorState.suppliers || errorState.products
  if (hasAnyError && warehouses.value.length === 0 && suppliers.value.length === 0 && products.value.length === 0) {
    errorMessage.value = 'Không thể tải dữ liệu nền. Vui lòng thử lại sau.'
  }
}

function validateForm() {
  formErrors.warehouseId = ''
  formErrors.supplierId = ''
  formErrors.note = ''

  let isValid = true

  if (!form.warehouseId) {
    formErrors.warehouseId = 'Vui lòng chọn kho nhập.'
    isValid = false
  }

  if (!form.supplierId) {
    formErrors.supplierId = 'Vui lòng chọn nhà cung cấp.'
    isValid = false
  }

  if (form.note && form.note.length > 255) {
    formErrors.note = 'Ghi chú không được vượt quá 255 ký tự.'
    isValid = false
  }

  return isValid
}

function validateItem() {
  itemErrors.productId = ''
  itemErrors.quantity = ''
  itemErrors.unitPrice = ''

  let isValid = true

  if (!itemDraft.productId) {
    itemErrors.productId = 'Vui lòng chọn sản phẩm.'
    isValid = false
  }

  if (!itemDraft.quantity || itemDraft.quantity <= 0) {
    itemErrors.quantity = 'Số lượng phải lớn hơn 0.'
    isValid = false
  }

  if (itemDraft.unitPrice === null || itemDraft.unitPrice === undefined || itemDraft.unitPrice < 0) {
    itemErrors.unitPrice = 'Đơn giá phải lớn hơn hoặc bằng 0.'
    isValid = false
  }

  if (itemDraft.productId && items.value.some(item => item.productId === itemDraft.productId)) {
    itemErrors.productId = 'Sản phẩm đã được thêm vào danh sách.'
    isValid = false
  }

  return isValid
}

function addItem() {
  if (!validateItem()) return

  const product = products.value.find(p => p.id === itemDraft.productId)
  if (!product) {
    itemErrors.productId = 'Sản phẩm không hợp lệ.'
    return
  }

  items.value.push({
    productId: itemDraft.productId,
    productCode: product.code || product.sku,
    productName: product.name,
    quantity: itemDraft.quantity,
    unitPrice: itemDraft.unitPrice,
    note: itemDraft.note.trim(),
    lineTotal: itemDraft.quantity * itemDraft.unitPrice,
  })

  itemDraft.productId = null
  itemDraft.quantity = 1
  itemDraft.unitPrice = 0
  itemDraft.note = ''
  itemErrors.productId = ''
  itemErrors.quantity = ''
  itemErrors.unitPrice = ''
}

function removeItem(index) {
  items.value.splice(index, 1)
}

async function handleSaveDraft() {
  if (!validateForm()) {
    errorMessage.value = 'Vui lòng kiểm tra lại thông tin phiếu nhập.'
    return
  }

  if (items.value.length === 0) {
    errorMessage.value = 'Vui lòng thêm ít nhất một sản phẩm vào phiếu nhập.'
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const createPayload = {
      warehouseId: form.warehouseId,
      supplierId: form.supplierId,
      note: form.note.trim() || null,
    }

    const receipt = await createImportReceipt(createPayload)

    const draftPayload = {
      warehouseId: form.warehouseId,
      supplierId: form.supplierId,
      note: form.note.trim() || null,
      items: items.value.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        note: item.note || null,
      })),
    }

    await saveDraft(receipt.id, draftPayload)

    successMessage.value = 'Lưu phiếu nhập thành công.'

    setTimeout(() => {
      router.push('/stock-in')
    }, 1500)
  } catch (error) {
    if (error.status === 401) {
      router.replace('/login')
      return
    }

    errorMessage.value = error.message

    if (error.errors) {
      if (error.errors.warehouseId) formErrors.warehouseId = error.errors.warehouseId
      if (error.errors.supplierId) formErrors.supplierId = error.errors.supplierId
      if (error.errors.note) formErrors.note = error.errors.note
    }
  } finally {
    isSaving.value = false
  }
}

function goBack() {
  router.push('/stock-in')
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '0'
  return Number(value || 0).toLocaleString('vi-VN')
}
</script>

<template>
  <PageHeader :title="pageTitle" description="Nhập thông tin kho, nhà cung cấp và danh sách sản phẩm cần nhập kho.">
    <button class="btn btn-ghost" type="button" @click="goBack">
      <i class="mdi mdi-arrow-left"></i>
      Quay lại
    </button>
  </PageHeader>

  <template v-if="type === 'in' && isCreateMode">
    <div v-if="errorMessage" class="import-receipt-form__alert import-receipt-form__alert--error">
      <i class="mdi mdi-alert-circle-outline"></i>
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="successMessage" class="import-receipt-form__alert import-receipt-form__alert--success">
      <i class="mdi mdi-check-circle-outline"></i>
      <span>{{ successMessage }}</span>
    </div>

    <div v-if="isLoading" class="import-receipt-form__alert import-receipt-form__alert--info">
      <i class="mdi mdi-loading mdi-spin"></i>
      <span>Đang tải dữ liệu...</span>
    </div>

    <form v-if="!isLoading" class="import-receipt-form" @submit.prevent="handleSaveDraft">
      <section class="import-receipt-form__section">
        <h3 class="import-receipt-form__section-title">Thông tin chung</h3>

        <div class="import-receipt-form__grid import-receipt-form__grid--2">
          <div class="import-receipt-form__field">
            <label class="import-receipt-form__label import-receipt-form__label--required">Kho nhập</label>
            <select
              v-model="form.warehouseId"
              class="import-receipt-form__select"
              :class="{ 'import-receipt-form__select--error': formErrors.warehouseId || errorState.warehouses }"
              :disabled="isSaving || warehouses.length === 0"
            >
              <option :value="null" disabled>{{ warehouses.length === 0 ? 'Không có kho' : 'Chọn kho' }}</option>
              <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                {{ warehouse.tenKho }}
              </option>
            </select>
            <span v-if="formErrors.warehouseId" class="import-receipt-form__error">{{ formErrors.warehouseId }}</span>
            <span v-else-if="errorState.warehouses" class="import-receipt-form__error">{{ errorState.warehouses }}</span>
          </div>

          <div class="import-receipt-form__field">
            <label class="import-receipt-form__label import-receipt-form__label--required">Nhà cung cấp</label>
            <select
              v-model="form.supplierId"
              class="import-receipt-form__select"
              :class="{ 'import-receipt-form__select--error': formErrors.supplierId || errorState.suppliers }"
              :disabled="isSaving || suppliers.length === 0"
            >
              <option :value="null" disabled>{{ suppliers.length === 0 ? 'Không có nhà cung cấp' : 'Chọn nhà cung cấp' }}</option>
              <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                {{ supplier.tenDoiTac }}
              </option>
            </select>
            <span v-if="formErrors.supplierId" class="import-receipt-form__error">{{ formErrors.supplierId }}</span>
            <span v-else-if="errorState.suppliers" class="import-receipt-form__error">{{ errorState.suppliers }}</span>
          </div>

          <div class="import-receipt-form__field" style="grid-column: 1 / -1">
            <label class="import-receipt-form__label">Ghi chú phiếu</label>
            <textarea
              v-model="form.note"
              class="import-receipt-form__textarea"
              :class="{ 'import-receipt-form__textarea--error': formErrors.note }"
              placeholder="Nhập ghi chú (tùy chọn)"
              :disabled="isSaving"
            ></textarea>
            <span v-if="formErrors.note" class="import-receipt-form__error">{{ formErrors.note }}</span>
          </div>
        </div>
      </section>

      <section class="import-receipt-form__section">
        <h3 class="import-receipt-form__section-title">Thêm sản phẩm</h3>

        <div class="import-receipt-form__grid import-receipt-form__grid--4">
          <div class="import-receipt-form__field">
            <label class="import-receipt-form__label import-receipt-form__label--required">Sản phẩm</label>
            <select
              v-model="itemDraft.productId"
              class="import-receipt-form__select"
              :class="{ 'import-receipt-form__select--error': itemErrors.productId || errorState.products }"
              :disabled="isSaving || products.length === 0"
            >
              <option :value="null" disabled>{{ products.length === 0 ? 'Không có sản phẩm' : 'Chọn sản phẩm' }}</option>
              <option v-for="product in products" :key="product.id" :value="product.id">
                {{ product.name }} ({{ product.code || product.sku }})
              </option>
            </select>
            <span v-if="itemErrors.productId" class="import-receipt-form__error">{{ itemErrors.productId }}</span>
            <span v-else-if="errorState.products" class="import-receipt-form__error">{{ errorState.products }}</span>
          </div>

          <div class="import-receipt-form__field">
            <label class="import-receipt-form__label import-receipt-form__label--required">Số lượng</label>
            <input
              v-model.number="itemDraft.quantity"
              type="number"
              min="1"
              class="import-receipt-form__input"
              :class="{ 'import-receipt-form__input--error': itemErrors.quantity }"
              placeholder="Nhập số lượng"
              :disabled="isSaving"
            />
            <span v-if="itemErrors.quantity" class="import-receipt-form__error">{{ itemErrors.quantity }}</span>
          </div>

          <div class="import-receipt-form__field">
            <label class="import-receipt-form__label import-receipt-form__label--required">Đơn giá (đ)</label>
            <input
              v-model.number="itemDraft.unitPrice"
              type="number"
              min="0"
              step="0.01"
              class="import-receipt-form__input"
              :class="{ 'import-receipt-form__input--error': itemErrors.unitPrice }"
              placeholder="Nhập đơn giá"
              :disabled="isSaving"
            />
            <span v-if="itemErrors.unitPrice" class="import-receipt-form__error">{{ itemErrors.unitPrice }}</span>
          </div>

          <div class="import-receipt-form__field">
            <label class="import-receipt-form__label">Ghi chú dòng</label>
            <input
              v-model="itemDraft.note"
              type="text"
              class="import-receipt-form__input"
              placeholder="Ghi chú (tùy chọn)"
              maxlength="255"
              :disabled="isSaving"
            />
          </div>

          <div class="import-receipt-form__field" style="grid-column: 1 / -1; justify-self: end">
            <button class="btn btn-primary" type="button" :disabled="isSaving" @click="addItem">
              <i class="mdi mdi-plus"></i>
              Thêm sản phẩm
            </button>
          </div>
        </div>
      </section>

      <section v-if="items.length > 0" class="import-receipt-form__section">
        <h3 class="import-receipt-form__section-title">Danh sách sản phẩm ({{ items.length }})</h3>

        <table class="import-receipt-form__items-table">
          <thead>
            <tr>
              <th>Mã SP</th>
              <th>Tên sản phẩm</th>
              <th style="text-align: right">Số lượng</th>
              <th style="text-align: right">Đơn giá</th>
              <th style="text-align: right">Thành tiền</th>
              <th>Ghi chú</th>
              <th style="width: 80px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in items" :key="index">
              <td>{{ item.productCode }}</td>
              <td>{{ item.productName }}</td>
              <td style="text-align: right">{{ item.quantity }}</td>
              <td style="text-align: right">{{ formatCurrency(item.unitPrice) }}</td>
              <td style="text-align: right; font-weight: 600">{{ formatCurrency(item.lineTotal) }}</td>
              <td>{{ item.note || '-' }}</td>
              <td>
                <button class="btn btn-sm btn-danger" type="button" :disabled="isSaving" @click="removeItem(index)">
                  <i class="mdi mdi-delete-outline"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <div class="import-receipt-form__actions">
        <button class="btn btn-ghost" type="button" :disabled="isSaving" @click="goBack">Hủy</button>
        <button class="btn btn-primary" type="submit" :disabled="isSaving || items.length === 0">
          <i v-if="isSaving" class="mdi mdi-loading mdi-spin"></i>
          <i v-else class="mdi mdi-content-save-outline"></i>
          {{ isSaving ? 'Đang lưu...' : 'Lưu phiếu nhập' }}
        </button>
      </div>
    </form>
  </template>

  <template v-else-if="type === 'in' && isEditMode">
    <div class="import-receipt-form__alert import-receipt-form__alert--info">
      <i class="mdi mdi-information-outline"></i>
      <span>Chức năng sửa phiếu nhập cần API GET detail từ backend (out of scope T86).</span>
    </div>
    <div class="import-receipt-form__actions">
      <button class="btn btn-ghost" type="button" @click="goBack">Quay lại danh sách</button>
    </div>
  </template>

  <template v-else>
    <FeaturePending title="Chức năng phiếu xuất kho đang được phát triển" />
  </template>
</template>

<style scoped>
@import '../assets/styles/import-receipt-form.css';

.mdi-spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
