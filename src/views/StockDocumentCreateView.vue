<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/PageHeader.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PriceInput from '../components/PriceInput.vue'
import SearchableSelect from '../components/SearchableSelect.vue'
import {
  cancelDraft,
  createImportReceipt,
  getDetail,
  getProducts,
  getSuppliers,
  getWarehouses,
  saveDraft,
  submitForApproval,
  updateEditable,
} from '../services/importReceiptService'
import { cancelExportReceipt, createExportReceipt, getExportReceipt, submitExportReceipt, updateExportReceipt } from '../services/exportReceiptService'
import { getCurrentRoleCode, getCurrentUser } from '../services/authService'
import { getInventory } from '../services/inventoryService'
import { getAssignment } from '../services/aiPurchaseAssignmentService'
import { getProduct } from '../services/productService'

const props = defineProps({
  type: { type: String, default: 'in' },
  id: { type: String, default: '' },
  mode: { type: String, default: 'create' },
})

const router = useRouter()
const route = useRoute()
const aiPurchaseRequestId = ref(route.query.aiPurchaseRequestId ? Number(route.query.aiPurchaseRequestId) : null)
const { t } = useI18n()
const isLoading = ref(false)
const isSaving = ref(false)
const isSubmitting = ref(false)
const isCancelling = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const receiptId = ref(props.id || '')
const receiptStatus = ref('NHAP')
const receiptVersion = ref(0)
const rejectionReason = ref('')
const receiptCreatedBy = ref('')
const receiptCreatedById = ref('')
const isDirty = ref(false)
const isHydrating = ref(false)
const confirmState = reactive({ open: false, action: '' })
let redirectTimer = null

const warehouses = ref([])
const suppliers = ref([])

const warehouseOptions = computed(() => {
  return warehouses.value.map(w => ({
    value: w.id,
    label: w.tenKho || w.name || '',
    sublabel: w.maKho || w.code || w.diaChi || '',
    searchKey: `${w.tenKho || w.name || ''} ${w.maKho || w.code || ''}`.toLowerCase()
  }));
});

const supplierOptions = computed(() => {
  return suppliers.value.map(s => ({
    value: s.id,
    label: s.tenDoiTac || s.name || '',
    sublabel: s.maDoiTac || s.code || s.soDienThoai || '',
    searchKey: `${s.tenDoiTac || s.name || ''} ${s.maDoiTac || s.code || ''}`.toLowerCase()
  }));
});

const products = ref([])
const isSearchingProducts = ref(false)

async function searchProducts(query = '') {
  isSearchingProducts.value = true
  try {
    const list = await getProducts({
      page: 0,
      size: 20,
      keyword: query,
      trangThai: 'HOAT_DONG'
    })
    products.value = list || []
  } catch (error) {
    console.error('Failed to remote search products:', error)
  } finally {
    isSearchingProducts.value = false
  }
}

const productOptions = computed(() => {
  return products.value.map(product => ({
    value: product.id,
    label: product.name,
    sublabel: product.code || product.sku || '',
    searchKey: `${product.name} ${product.code || product.sku || ''}`.toLowerCase()
  }));
});

function scheduleRedirectToList(delay) {
  if (redirectTimer) clearTimeout(redirectTimer)
  redirectTimer = setTimeout(() => {
    router.push(props.type === 'out' ? '/stock-out' : '/stock-in')
  }, delay)
}

onBeforeUnmount(() => {
  if (redirectTimer) clearTimeout(redirectTimer)
})

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
  unitPrice: '',
  note: '',
})

const items = ref([])
const formErrors = reactive({ warehouseId: '', supplierId: '', note: '' })
const itemErrors = reactive({ productId: '', quantity: '', unitPrice: '' })
const selectedProductStock = ref(null)
const isLoadingStock = ref(false)

const hasOperationalPermission = computed(() => ['ADMIN', 'EMPLOYEE'].includes(getCurrentRoleCode()))
const isCreateMode = computed(() => props.mode === 'create')
const isEditMode = computed(() => props.mode === 'edit')
const isReceiptOwner = computed(() => {
  if (isCreateMode.value) return true
  const role = getCurrentRoleCode()
  if (role === 'ADMIN') return true
  const currentUser = getCurrentUser()
  if (!currentUser) return false

  const matchByName = receiptCreatedBy.value && (receiptCreatedBy.value === currentUser.fullName || receiptCreatedBy.value === currentUser.email)
  const matchById = receiptCreatedById.value && String(receiptCreatedById.value) === String(currentUser.employeeId)

  if (!receiptCreatedBy.value && !receiptCreatedById.value) return true

  return Boolean(matchByName || matchById)
})
const isProcessing = computed(() => isSaving.value || isSubmitting.value || isCancelling.value)
const isEditableStatus = computed(() => hasOperationalPermission.value && isReceiptOwner.value && (isCreateMode.value || receiptStatus.value === 'NHAP' || receiptStatus.value === 'TU_CHOI'))
const pageTitle = computed(() => {
  if (props.type === 'out') return isEditMode.value ? t('stockDocumentCreate.title.editOut') : t('stockDocumentCreate.title.createOut')
  return isEditMode.value ? t('stockDocumentCreate.title.editIn') : t('stockDocumentCreate.title.createIn')
})

const detailCount = computed(() => items.value.length)
const hasValidItems = computed(() => items.value.length > 0 && items.value.every(item => {
  return item.productId && Number(item.quantity) > 0 && Number(item.unitPrice) >= 0
}))
const canSubmit = computed(() => hasOperationalPermission.value && isReceiptOwner.value && receiptId.value && ['NHAP', 'TU_CHOI'].includes(receiptStatus.value) && hasValidItems.value)
const canCancel = computed(() => hasOperationalPermission.value && isReceiptOwner.value && receiptId.value && ['NHAP', 'TU_CHOI'].includes(receiptStatus.value))
const canSave = computed(() => hasOperationalPermission.value && isReceiptOwner.value && (isCreateMode.value || receiptStatus.value === 'NHAP' || receiptStatus.value === 'TU_CHOI'))
const isRejectedImportReceipt = computed(() => isEditMode.value && receiptStatus.value === 'TU_CHOI')
const normalizedRejectionReason = computed(() => String(rejectionReason.value || '').trim())
const rejectionReasonMessage = computed(() => normalizedRejectionReason.value || 't("stockDocumentCreate.alerts.noRejectReason")')

const totalQuantity = computed(() => {
  return items.value.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
})

const totalAmountPreview = computed(() => {
  return items.value.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0)
})

onMounted(async () => {
  if (!hasOperationalPermission.value) {
    router.replace(props.type === 'out' ? '/stock-out' : '/stock-in')
    return
  }
  await loadDropdowns()
  if (isEditMode.value) {
    await loadReceiptDetail()
  } else if (aiPurchaseRequestId.value && props.type === 'in') {
    isLoading.value = true
    try {
      const assignment = await getAssignment(aiPurchaseRequestId.value)
      if (assignment) {
        if (assignment.importReceiptId) {
          errorMessage.value = t('stockDocumentCreate.messages.assignmentAlreadyLinked')
          isLoading.value = false
          return
        }
        form.warehouseId = assignment.warehouseId

        const product = await getProduct(assignment.productId)
        if (!product) {
          errorMessage.value = t('stockDocumentCreate.messages.loadProductDetailError')
          isLoading.value = false
          return
        }

        const supplierId = assignment.supplierId || product.partnerId
        if (!supplierId) {
          errorMessage.value = t('stockDocumentCreate.messages.resolveSupplierError')
          isLoading.value = false
          return
        }

        const supplierExists = suppliers.value.some(s => s.id === supplierId)
        if (!supplierExists) {
          suppliers.value.push({
            id: supplierId,
            tenDoiTac: assignment.supplierName || product.partnerName || 'Supplier',
            maDoiTac: '',
            soDienThoai: ''
          })
        }
        form.supplierId = supplierId
        form.note = assignment.content || ''

        const productExists = products.value.some(p => p.id === assignment.productId)
        if (!productExists) {
          products.value.push({
            id: product.id,
            name: product.name,
            code: product.code,
            sku: product.sku,
            price: product.price
          })
        }

        items.value.push({
          productId: assignment.productId,
          productCode: product.code || product.sku || assignment.productCode,
          productName: product.name || assignment.productName,
          quantity: assignment.requestedQuantity,
          unitPrice: product.price ?? 0,
          note: assignment.content || '',
          lineTotal: assignment.requestedQuantity * (product.price ?? 0),
        })
      }
    } catch (error) {
      console.error('Failed to load assignment details:', error)
      errorMessage.value = error.message || t('stockDocumentCreate.messages.loadAssignmentError')
    } finally {
      isLoading.value = false
    }
  }
  isDirty.value = false
})

watch(form, () => {
  if (!isHydrating.value) isDirty.value = true
}, { deep: true })

watch(items, () => {
  if (!isHydrating.value) isDirty.value = true
}, { deep: true })

watch(() => itemDraft.productId, (newProductId) => {
  if (newProductId) {
    const product = products.value.find(p => String(p.id) === String(newProductId))
    if (product) {
      itemDraft.unitPrice = product.price ?? ''
    }
  } else {
    itemDraft.unitPrice = ''
  }
})

watch(() => [form.warehouseId, itemDraft.productId], async ([newWarehouseId, newProductId]) => {
  if (newWarehouseId && newProductId) {
    isLoadingStock.value = true
    try {
      const data = await getInventory({ warehouseId: newWarehouseId, productId: newProductId, page: 0, size: 1 })
      const inventoryItem = data.content?.[0]
      selectedProductStock.value = inventoryItem ? inventoryItem.currentQuantity : 0
    } catch (error) {
      console.error('Error fetching selected product stock:', error)
      selectedProductStock.value = 0
    } finally {
      isLoadingStock.value = false
    }
  } else {
    selectedProductStock.value = null
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
    getProducts({ page: 0, size: 20 }),
  ])

  const [whResult, suppResult, prodResult] = results

  if (whResult.status === 'fulfilled') {
    warehouses.value = whResult.value
    if (whResult.value.length === 0) {
      errorState.warehouses = t('stockDocumentCreate.messages.noActiveWarehouses')
    }
  } else {
    errorState.warehouses = whResult.reason?.message || t('stockDocumentCreate.messages.loadWarehouseError')
    if (whResult.reason?.status === 401) router.replace('/login')
  }

  if (suppResult.status === 'fulfilled') {
    suppliers.value = suppResult.value
    if (suppResult.value.length === 0) {
      errorState.suppliers = t('stockDocumentCreate.messages.noActiveSuppliers')
    }
  } else {
    errorState.suppliers = suppResult.reason?.message || t('stockDocumentCreate.messages.loadSupplierError')
    if (suppResult.reason?.status === 401) router.replace('/login')
  }

  if (prodResult.status === 'fulfilled') {
    products.value = prodResult.value
    if (prodResult.value.length === 0) {
      errorState.products = t('stockDocumentCreate.messages.noActiveProducts')
    }
  } else {
    errorState.products = prodResult.reason?.message || t('stockDocumentCreate.messages.loadProductError')
    if (prodResult.reason?.status === 401) router.replace('/login')
  }

  isLoading.value = false

  const hasAnyError = errorState.warehouses || errorState.suppliers || errorState.products
  if (hasAnyError && warehouses.value.length === 0 && suppliers.value.length === 0 && products.value.length === 0) {
    errorMessage.value = t('stockDocumentCreate.messages.loadBaseDataError')
  }
}

async function loadReceiptDetail() {
  if (!receiptId.value) return

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  isHydrating.value = true

  try {
    const receipt = props.type === 'out' ? await getExportReceipt(receiptId.value) : await getDetail(receiptId.value)
    hydrateReceipt(receipt)
    if (!isReceiptOwner.value) {
      router.replace(props.type === 'out' ? '/stock-out' : '/stock-in')
      return
    }
  } catch (error) {
    errorMessage.value = error.message || t('stockDocumentCreate.messages.loadReceiptError')
    if (error.status === 401) router.replace('/login')
  } finally {
    await markHydrationComplete()
    isLoading.value = false
  }
}

function hydrateReceipt(receipt) {
  receiptId.value = receipt.id || receiptId.value
  receiptStatus.value = receipt.status || 'NHAP'
  receiptVersion.value = receipt.version ?? receiptVersion.value
  receiptCreatedBy.value = receipt.createdBy || receipt.createdByName || ''
  receiptCreatedById.value = receipt.createdById || receipt.employeeId || ''
  if (Object.prototype.hasOwnProperty.call(receipt, 'rejectionReason')) {
    rejectionReason.value = receipt.rejectionReason || ''
  }
  form.warehouseId = receipt.warehouseId || null
  form.supplierId = receipt.supplierId || receipt.partnerId || null
  form.note = receipt.note || ''
  items.value = (receipt.details || receipt.items || []).map(item => ({
    productId: item.productId,
    productCode: item.productCode,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    note: item.note || '',
    lineTotal: item.lineTotal ?? (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    availableStock: item.availableStock ?? item.currentInventory ?? null,
    exceedsAvailableStock: item.exceedsAvailableStock ?? item.warning ?? false,
  }))
}

function buildDraftPayload() {
  return {
    warehouseId: form.warehouseId,
    ...(props.type === 'out' ? { partnerId: form.supplierId } : { supplierId: form.supplierId }),
    note: form.note.trim() || null,
    [props.type === 'out' ? 'details' : 'items']: items.value.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      note: item.note || null,
    })),
  }
}

async function markHydrationComplete() {
  await nextTick()
  isDirty.value = false
  isHydrating.value = false
}

async function applySavedReceipt(receipt) {
  isHydrating.value = true
  hydrateReceipt(receipt)
  await markHydrationComplete()
}

function validateForm() {
  formErrors.warehouseId = ''
  formErrors.supplierId = ''
  formErrors.note = ''

  let isValid = true

  if (!form.warehouseId) {
    formErrors.warehouseId = t('stockDocumentCreate.validation.selectWarehouse', { type: props.type === 'out' ? t('stockDocumentCreate.type.out') : t('stockDocumentCreate.type.in') })
    isValid = false
  }

  if (props.type === 'in' && !form.supplierId) {
    formErrors.supplierId = t('stockDocumentCreate.validation.selectSupplier')
    isValid = false
  }

  if (form.note && form.note.length > 255) {
    formErrors.note = t('stockDocumentCreate.validation.noteLength')
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
    itemErrors.productId = t('stockDocumentCreate.validation.selectProduct')
    isValid = false
  }

  if (!itemDraft.quantity || itemDraft.quantity <= 0) {
    itemErrors.quantity = t('stockDocumentCreate.validation.quantityMin')
    isValid = false
  }

  if (itemDraft.unitPrice === null || itemDraft.unitPrice === undefined || itemDraft.unitPrice === '' || Number(itemDraft.unitPrice) < 0) {
    itemErrors.unitPrice = t('stockDocumentCreate.validation.unitPriceMin')
    isValid = false
  }

  if (itemDraft.productId && items.value.some(item => item.productId === itemDraft.productId)) {
    itemErrors.productId = t('stockDocumentCreate.validation.productExists')
    isValid = false
  }

  if (props.type === 'out' && selectedProductStock.value !== null && itemDraft.quantity > selectedProductStock.value) {
    itemErrors.quantity = t('stockDocumentCreate.validation.quantityExceedsStock', { stock: selectedProductStock.value })
    isValid = false
  }

  return isValid
}

function addItem() {
  if (!validateItem()) return

  const product = products.value.find(p => p.id === itemDraft.productId)
  if (!product) {
    itemErrors.productId = t('stockDocumentCreate.validation.invalidProduct')
    return
  }

  items.value.push({
    productId: itemDraft.productId,
    productCode: product.code || product.sku,
    productName: product.name,
    quantity: itemDraft.quantity,
    unitPrice: Number(itemDraft.unitPrice) || 0,
    note: itemDraft.note.trim(),
    lineTotal: itemDraft.quantity * (Number(itemDraft.unitPrice) || 0),
  })

  itemDraft.productId = null
  itemDraft.quantity = 1
  itemDraft.unitPrice = ''
  itemDraft.note = ''
  itemErrors.productId = ''
  itemErrors.quantity = ''
  itemErrors.unitPrice = ''
}

function removeItem(index) {
  items.value.splice(index, 1)
}

async function handleSaveDraft() {
  if (!canSave.value) return

  if (!validateForm()) {
    errorMessage.value = t('stockDocumentCreate.messages.checkFormInfo')
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const draftPayload = buildDraftPayload()
    let savedReceipt

    if (props.type === 'out') {
      savedReceipt = receiptId.value
        ? await updateExportReceipt(receiptId.value, draftPayload)
        : await createExportReceipt(draftPayload)
      receiptId.value = savedReceipt.id
    } else if (!receiptId.value) {
      const payload = {
        warehouseId: form.warehouseId,
        supplierId: form.supplierId,
        note: form.note.trim() || null,
      }
      if (aiPurchaseRequestId.value) {
        payload.aiPurchaseRequestId = aiPurchaseRequestId.value
      }
      const receipt = await createImportReceipt(payload)
      receiptId.value = receipt.id
      savedReceipt = await saveDraft(receipt.id, draftPayload)
    } else if (receiptStatus.value === 'TU_CHOI') {
      savedReceipt = await updateEditable(receiptId.value, draftPayload)
    } else {
      savedReceipt = await saveDraft(receiptId.value, draftPayload)
    }

    await applySavedReceipt(savedReceipt)
    successMessage.value = receiptStatus.value === 'TU_CHOI'
      ? t('stockDocumentCreate.messages.saveDraftSuccessRejected')
      : t('stockDocumentCreate.messages.saveDraftSuccess')

    if (isCreateMode.value) {
      scheduleRedirectToList(1500)
    }
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

function handleSubmitForApproval() {
  if (!canSubmit.value) {
    errorMessage.value = t('stockDocumentCreate.messages.submitValidProductRequired')
    return
  }
  if (isDirty.value) {
    errorMessage.value = t('stockDocumentCreate.messages.saveDraftBeforeSubmit')
    return
  }
  confirmState.open = true
  confirmState.action = 'submit'
}

function submitButtonLabel() {
  return receiptStatus.value === 'TU_CHOI' ? t('stockDocumentCreate.actions.resubmit') : t('stockDocumentCreate.actions.submit')
}

function handleCancelDraft() {
  if (!canCancel.value) return
  confirmState.open = true
  confirmState.action = 'cancel'
}

function closeConfirmDialog() {
  confirmState.open = false
  confirmState.action = ''
}

async function confirmDraftAction() {
  const action = confirmState.action
  closeConfirmDialog()

  if (action === 'submit') {
    await confirmSubmitForApproval()
  } else if (action === 'cancel') {
    await confirmCancelDraft()
  }
}

async function confirmSubmitForApproval() {
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const receipt = props.type === 'out'
      ? await submitExportReceipt(receiptId.value, receiptVersion.value)
      : await submitForApproval(receiptId.value)
    await applySavedReceipt(receipt)
    successMessage.value = t('stockDocumentCreate.messages.submitSuccess')
    scheduleRedirectToList(1200)
  } catch (error) {
    if (error.status === 401) {
      router.replace('/login')
      return
    }
    errorMessage.value = error.message || t('stockDocumentCreate.messages.actionFailed')
  } finally {
    isSubmitting.value = false
  }
}

async function confirmCancelDraft() {
  isCancelling.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const receipt = props.type === 'out' ? await cancelExportReceipt(receiptId.value) : await cancelDraft(receiptId.value)
    if (receipt) await applySavedReceipt(receipt)
    successMessage.value = t('stockDocumentCreate.messages.cancelSuccess')
    scheduleRedirectToList(1200)
  } catch (error) {
    if (error.status === 401) {
      router.replace('/login')
      return
    }
    errorMessage.value = error.message || 'Thao tác thất bại, vui lòng thử lại.'
  } finally {
    isCancelling.value = false
  }
}

function goBack() {
  router.push(props.type === 'out' ? '/stock-out' : '/stock-in')
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '0 ₫'
  return Number(value || 0).toLocaleString('vi-VN') + ' ₫'
}

function confirmTitle() {
  return confirmState.action === 'cancel' ? t('stockDocumentCreate.confirm.cancelTitle') : t('stockDocumentCreate.confirm.submitTitle')
}

function confirmMessage() {
  return confirmState.action === 'cancel'
    ? t('stockDocumentCreate.confirm.cancelMessage', { type: props.type === 'out' ? t('stockDocumentCreate.type.out') : t('stockDocumentCreate.type.in') })
    : t('stockDocumentCreate.confirm.submitMessage', { type: props.type === 'out' ? t('stockDocumentCreate.type.out') : t('stockDocumentCreate.type.in') })
}

function confirmText() {
  return confirmState.action === 'cancel' ? t('stockDocumentCreate.confirm.cancelBtn') : t('stockDocumentCreate.confirm.submitBtn')
}
</script>

<template>
  <PageHeader :title="pageTitle" :description="type === 'out' ? t('stockDocumentCreate.headerDesc.out') : t('stockDocumentCreate.headerDesc.in')">
    <button class="btn btn-ghost" type="button" @click="goBack">
      <i class="mdi mdi-arrow-left"></i>
      {{ t("stockDocumentCreate.actions.back") }}
    </button>
  </PageHeader>

  <template v-if="isCreateMode || isEditMode">
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
      <span>{{ t("stockDocumentCreate.loading") }}</span>
    </div>

    <form v-if="!isLoading" class="import-receipt-form pb-16" @submit.prevent="handleSaveDraft">
      <div v-if="isRejectedImportReceipt" class="import-receipt-form__alert import-receipt-form__alert--error">
        <i class="mdi mdi-information-outline"></i>
        <div>
          <p class="import-receipt-form__rejection-title">{{ t("stockDocumentCreate.alerts.rejectedTitle") }}</p>
          <p class="import-receipt-form__rejection-reason">
            <template v-if="normalizedRejectionReason">{{ t("stockDocumentCreate.alerts.rejectReason") }}: {{ rejectionReasonMessage }}</template>
            <template v-else>{{ rejectionReasonMessage }}</template>
          </p>
          <p class="import-receipt-form__rejection-reason mt-1">{{ t("stockDocumentCreate.alerts.editAndSave") }}</p>
        </div>
      </div>

      <!-- Section: {{ t("stockDocumentCreate.section.generalInfo") }} -->
      <section class="import-receipt-form__section">
        <h3 class="import-receipt-form__section-title">Thông tin chung</h3>

        <div class="import-receipt-form__grid import-receipt-form__grid--2">
          <div class="import-receipt-form__field">
            <label class="import-receipt-form__label import-receipt-form__label--required">{{ type === 'out' ? t('stockDocumentCreate.label.warehouseOut') : t('stockDocumentCreate.label.warehouseIn') }}</label>
            <SearchableSelect
              v-model="form.warehouseId"
              :options="warehouseOptions"
              :placeholder="warehouses.length === 0 ? t('stockDocumentCreate.placeholder.noWarehouse') : t('stockDocumentCreate.placeholder.selectWarehouse')"
              :disabled="isProcessing || !isEditableStatus || warehouses.length === 0 || items.length > 0"
              :error="formErrors.warehouseId || errorState.warehouses"
            />
            <span v-if="formErrors.warehouseId" class="import-receipt-form__error">{{ formErrors.warehouseId }}</span>
            <span v-else-if="errorState.warehouses" class="import-receipt-form__error">{{ errorState.warehouses }}</span>
          </div>

          <div class="import-receipt-form__field">
            <label class="import-receipt-form__label" :class="{ 'import-receipt-form__label--required': type === 'in' }">{{ type === 'out' ? t('stockDocumentCreate.label.partner') : t('stockDocumentCreate.label.supplier') }}</label>
            <SearchableSelect
              v-model="form.supplierId"
              :options="supplierOptions"
              :placeholder="suppliers.length === 0 ? t('stockDocumentCreate.placeholder.noSupplier') : t('stockDocumentCreate.placeholder.selectSupplier')"
              :disabled="isProcessing || !isEditableStatus || suppliers.length === 0 || items.length > 0"
              :error="formErrors.supplierId || errorState.suppliers"
            />
            <span v-if="formErrors.supplierId" class="import-receipt-form__error">{{ formErrors.supplierId }}</span>
            <span v-else-if="errorState.suppliers" class="import-receipt-form__error">{{ errorState.suppliers }}</span>
          </div>

          <div class="import-receipt-form__field" style="grid-column: 1 / -1">
            <label class="import-receipt-form__label">{{ t("stockDocumentCreate.label.note") }}</label>
            <textarea
              v-model="form.note"
              class="import-receipt-form__textarea"
              :class="{ 'import-receipt-form__textarea--error': formErrors.note }"
              :placeholder="t('stockDocumentCreate.placeholder.note')"
              :disabled="isProcessing || !isEditableStatus"
            ></textarea>
            <span v-if="formErrors.note" class="import-receipt-form__error">{{ formErrors.note }}</span>
          </div>
        </div>
      </section>

      <!-- Section: {{ t("stockDocumentCreate.section.addProduct") }} -->
      <section class="import-receipt-form__section">
        <h3 class="import-receipt-form__section-title">Thêm sản phẩm</h3>

        <div class="import-receipt-form__grid import-receipt-form__grid--4">
          <div class="import-receipt-form__field">
            <label class="import-receipt-form__label import-receipt-form__label--required">{{ t("stockDocumentCreate.label.product") }}</label>
            <SearchableSelect
              v-model="itemDraft.productId"
              :options="productOptions"
              :placeholder="products.length === 0 ? t('stockDocumentCreate.placeholder.noProduct') : t('stockDocumentCreate.placeholder.selectProduct')"
              :disabled="isProcessing || !isEditableStatus || products.length === 0"
              :error="itemErrors.productId || errorState.products"
              :remote="true"
              :loading="isSearchingProducts"
              @search="searchProducts"
            />
            <span v-if="itemErrors.productId" class="import-receipt-form__error">{{ itemErrors.productId }}</span>
            <span v-else-if="errorState.products" class="import-receipt-form__error">{{ errorState.products }}</span>

            <!-- Stock indicator helper -->
            <div v-if="itemDraft.productId" class="mt-1.5 text-sm" style="display: flex; align-items: center; gap: 6px; line-height: 1.4; font-weight: 600;">
              <span v-if="!form.warehouseId" style="color: #d97706;">
                ⚠️ Vui lòng chọn kho để xem tồn kho
              </span>
              <span v-else-if="isLoadingStock" style="color: #64748b;">
                🔄 Đang kiểm tra tồn kho...
              </span>
              <span v-else-if="selectedProductStock !== null" :style="{ color: selectedProductStock > 0 ? '#16825d' : '#dc2626' }">
                📦 Tồn kho hiện tại: {{ selectedProductStock }}
              </span>
            </div>
          </div>

          <div class="import-receipt-form__field">
            <label class="import-receipt-form__label import-receipt-form__label--required">{{ t("stockDocumentCreate.label.quantity") }}</label>
            <input
              v-model.number="itemDraft.quantity"
              type="number"
              min="1"
              class="import-receipt-form__input"
              :class="{ 'import-receipt-form__input--error': itemErrors.quantity }"
              :placeholder="t('stockDocumentCreate.placeholder.quantity')"
              :disabled="isProcessing || !isEditableStatus"
            />
            <span v-if="itemErrors.quantity" class="import-receipt-form__error">{{ itemErrors.quantity }}</span>
          </div>

          <div class="import-receipt-form__field">
            <label class="import-receipt-form__label import-receipt-form__label--required">{{ t("stockDocumentCreate.label.unitPrice") }}</label>
            <PriceInput
              v-model="itemDraft.unitPrice"
              class="import-receipt-form__input"
              :class="{ 'import-receipt-form__input--error': itemErrors.unitPrice }"
              :placeholder="t('stockDocumentCreate.placeholder.unitPrice')"
              :disabled="isProcessing || !isEditableStatus"
            />
            <span v-if="itemErrors.unitPrice" class="import-receipt-form__error">{{ itemErrors.unitPrice }}</span>
          </div>

          <div class="import-receipt-form__field">
            <label class="import-receipt-form__label">{{ t("stockDocumentCreate.label.lineNote") }}</label>
            <input
              v-model="itemDraft.note"
              type="text"
              class="import-receipt-form__input"
              :placeholder="t('stockDocumentCreate.placeholder.lineNote')"
              maxlength="255"
              :disabled="isProcessing || !isEditableStatus"
            />
          </div>

          <div class="import-receipt-form__field" style="grid-column: 1 / -1; justify-self: end">
            <button class="btn btn-primary" type="button" :disabled="isProcessing || !isEditableStatus" @click="addItem">
              <i class="mdi mdi-plus"></i> Thêm sản phẩm
            </button>
          </div>
        </div>
      </section>

      <!-- Section: Danh sách sản phẩm -->
      <section class="import-receipt-form__section">
        <h3 class="import-receipt-form__section-title">{{ t("stockDocumentCreate.section.productList", { count: detailCount }) }}</h3>

        <!-- Desktop view table -->
        <div class="hidden md:block">
          <table v-if="items.length > 0" class="import-receipt-form__items-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center">STT</th>
                <th>{{ t("stockDocumentCreate.table.code") }}</th>
                <th>{{ t("stockDocumentCreate.table.name") }}</th>
                <th style="text-align: right">Số lượng</th>
                <th v-if="type === 'out'" style="text-align: right">Tồn hiện tại</th>
                <th style="text-align: right">Đơn giá</th>
                <th style="text-align: right">Thành tiền</th>
                <th>{{ t("stockDocumentCreate.table.note") }}</th>
                <th style="width: 80px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in items" :key="index">
                <td style="text-align: center">{{ index + 1 }}</td>
                <td>{{ item.productCode }}</td>
                <td>{{ item.productName }}</td>
                <td style="text-align: right; font-weight: 600">{{ item.quantity }}</td>
                <td v-if="type === 'out'" style="text-align: right">
                  <span :class="{ 'text-danger font-bold': item.exceedsAvailableStock }">
                    {{ item.availableStock ?? '-' }}
                  </span>
                  <span v-if="item.exceedsAvailableStock" class="text-danger block text-xxs font-normal"> ({{ t("stockDocumentCreate.table.exceedsStock") }})</span>
                </td>
                <td style="text-align: right">{{ formatCurrency(item.unitPrice) }}</td>
                <td style="text-align: right; font-weight: 700" class="text-primary">{{ formatCurrency(item.lineTotal) }}</td>
                <td>{{ item.note || '-' }}</td>
                <td>
                  <button class="btn btn-sm btn-danger" type="button" :disabled="isProcessing || !isEditableStatus" @click="removeItem(index)">
                    <i class="mdi mdi-delete-outline"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="import-receipt-form__summary-row">
                <td :colspan="type === 'out' ? 4 : 3" style="text-align: right; font-weight: 600">{{ t("stockDocumentCreate.table.total") }}:</td>
                <td style="text-align: right; font-weight: 700">{{ totalQuantity }}</td>
                <td style="text-align: right; font-weight: 700; font-size: 16px" class="import-receipt-form__summary-total">
                  {{ formatCurrency(totalAmountPreview) }}
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
          <div v-else class="import-receipt-form__empty">
            <i class="mdi mdi-package-variant-closed" style="font-size: 48px; color: #cbd5e1"></i>
            <p>{{ t("stockDocumentCreate.empty.title") }}</p>
            <p class="muted">{{ t("stockDocumentCreate.empty.desc") }}</p>
          </div>
        </div>

        <!-- Mobile view cards -->
        <div class="block md:hidden space-y-3">
          <div v-if="items.length > 0" class="space-y-3">
            <div v-for="(item, index) in items" :key="index" class="p-3 border border-gray-200 rounded-lg bg-slate-50 space-y-2 relative">
              <div class="between pr-8">
                <div class="font-bold text-sm text-text">{{ item.productName }}</div>
                <button class="btn btn-sm btn-icon btn-danger absolute top-2 right-2" type="button" :disabled="isProcessing || !isEditableStatus" @click="removeItem(index)">
                  <i class="mdi mdi-delete-outline"></i>
                </button>
              </div>
              <div class="text-xs text-muted">SKU: {{ item.productCode }}</div>
              
              <div class="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span class="text-muted block text-xxs uppercase font-semibold">Số lượng</span>
                  <span class="font-semibold">{{ item.quantity }}</span>
                </div>
                <div v-if="type === 'out'">
                  <span class="text-muted block text-xxs uppercase font-semibold">{{ t("stockDocumentCreate.table.currentStock") }}</span>
                  <span class="font-semibold" :class="{'text-danger font-bold': item.exceedsAvailableStock}">
                    {{ item.availableStock ?? '-' }}
                    <span v-if="item.exceedsAvailableStock" class="block text-xxs text-danger font-normal">(vượt tồn)</span>
                  </span>
                </div>
                <div>
                  <span class="text-muted block text-xxs uppercase font-semibold">Đơn giá</span>
                  <span>{{ formatCurrency(item.unitPrice) }}</span>
                </div>
                <div>
                  <span class="text-muted block text-xxs uppercase font-semibold">Thành tiền</span>
                  <span class="font-bold text-primary">{{ formatCurrency(item.lineTotal) }}</span>
                </div>
              </div>
              
              <div v-if="item.note" class="text-xs text-muted border-t border-gray-200 pt-2 mt-1">
                <strong>{{ t("stockDocumentCreate.label.lineNote") }}:</strong> {{ item.note }}
              </div>
            </div>
            
            <div class="bg-blue-50 p-3 rounded-lg flex justify-between items-center text-sm font-bold text-primary">
              <span>{{ t("stockDocumentCreate.mobile.total", { count: totalQuantity }) }}:</span>
              <span>{{ formatCurrency(totalAmountPreview) }}</span>
            </div>
          </div>
          
          <div v-else class="import-receipt-form__empty">
            <i class="mdi mdi-package-variant-closed" style="font-size: 48px; color: #cbd5e1"></i>
            <p>Chưa có sản phẩm nào được thêm vào phiếu.</p>
            <p class="muted">Thêm sản phẩm từ phần bên trên để bắt đầu.</p>
          </div>
        </div>
      </section>

      <!-- Sticky Action Footer -->
      <div class="sticky-footer p-4 flex items-center justify-between shadow-lg z-10 rounded-b-xl">
        <div class="text-sm font-semibold text-text hidden sm:block">
          {{ items.length }} mặt hàng · Tổng số lượng: {{ totalQuantity }} · Tổng tiền: <span class="text-primary font-bold">{{ formatCurrency(totalAmountPreview) }}</span>
        </div>
        <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button class="btn btn-ghost" type="button" :disabled="isProcessing" @click="goBack">Quay lại</button>
          
          <button v-if="canCancel" class="btn btn-danger" type="button" :disabled="isProcessing" @click="handleCancelDraft">
            <i v-if="isCancelling" class="mdi mdi-loading mdi-spin"></i>
            <i v-else class="mdi mdi-cancel"></i>
            {{ isCancelling ? t('stockDocumentCreate.actions.cancelling') : t('stockDocumentCreate.actions.cancel') }}
          </button>
          
          <button v-if="canSubmit" class="btn btn-secondary" type="button" :disabled="isProcessing" @click="handleSubmitForApproval">
            <i v-if="isSubmitting" class="mdi mdi-loading mdi-spin"></i>
            <i v-else class="mdi mdi-send-outline"></i>
            {{ isSubmitting ? t('stockDocumentCreate.actions.submitting') : submitButtonLabel() }}
          </button>
          
          <button v-if="canSave" class="btn btn-primary" type="submit" :disabled="isProcessing">
            <i v-if="isSaving" class="mdi mdi-loading mdi-spin"></i>
            <i v-else class="mdi mdi-content-save-outline"></i>
            {{ isSaving ? t('stockDocumentCreate.actions.saving') : (receiptStatus === 'TU_CHOI' ? t('stockDocumentCreate.actions.saveChanges') : t('stockDocumentCreate.actions.saveDraft')) }}
          </button>
        </div>
      </div>
    </form>

    <ConfirmDialog
      :open="confirmState.open"
      :title="confirmTitle()"
      :message="confirmMessage()"
      :confirm-text="confirmText()"
      :danger="confirmState.action === 'cancel'"
      @cancel="closeConfirmDialog"
      @confirm="confirmDraftAction"
    />
  </template>
</template>

<style>
@import '../assets/styles/import-receipt-form.css';
</style>

<style scoped>
.mdi-spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.sticky-footer {
  position: sticky;
  bottom: 0;
  margin-top: 24px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.05);
}

.text-xxs {
  font-size: 10px;
}
</style>
