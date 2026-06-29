<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  getDetail,
  confirmArrival,
  createDiscrepancyReport,
  completeImport
} from '../services/importReceiptService'

const props = defineProps({
  receiptId: {
    type: [String, Number],
    required: true
  }
})

const receipt = ref(null)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const successMessage = ref('')

// State cho form kiểm hàng
const inspectItems = ref([])

// State cho biên bản chênh lệch
const discrepancyNote = ref('')

const authStore = useAuthStore()
const canProcessReceipt = computed(() => {
  const role = authStore.currentRole
  return role === 'ADMIN' || role === 'MANAGER' || role === 'EMPLOYEE'
})

// Computed properties
const hasDiscrepancy = computed(() => {
  return inspectItems.value.some(item => item.actualReceivedQuantity !== item.expectedQuantity)
})

const discrepancyItems = computed(() => {
  return inspectItems.value.filter(item => item.actualReceivedQuantity !== item.expectedQuantity)
})

const statusColor = computed(() => {
  if (!receipt.value) return 'grey'
  const s = receipt.value.status
  if (s === 'HOAN_THANH') return 'success'
  if (s === 'HUY' || s === 'TU_CHOI') return 'error'
  if (s === 'CHO_HANG_VE' || s === 'CHO_KIEM_HANG') return 'warning'
  return 'primary'
})

const statusLabel = computed(() => {
  if (!receipt.value) return ''
  const labels = {
    NHAP: 'Bản nháp',
    CHO_DUYET_CAP_1: 'Chờ duyệt cấp 1',
    CHO_DUYET_CAP_2: 'Chờ duyệt cấp 2',
    CHO_HANG_VE: 'Chờ hàng về',
    CHO_KIEM_HANG: 'Chờ kiểm hàng',
    HOAN_THANH: 'Hoàn thành',
    TU_CHOI: 'Từ chối',
    HUY: 'Đã hủy'
  }
  return labels[receipt.value.status] || receipt.value.status
})

const physicalStatusOptions = ['Tốt', 'Hư hỏng', 'Thiếu', 'Khác']

let currentRequestId = 0

async function loadData() {
  const requestId = ++currentRequestId
  loading.value = true
  error.value = ''
  try {
    const data = await getDetail(props.receiptId)
    if (requestId !== currentRequestId) return
    receipt.value = data
    inspectItems.value = []
    discrepancyNote.value = ''
    // Khởi tạo form kiểm hàng
    if (data.items && data.items.length > 0) {
      inspectItems.value = data.items.map(item => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        expectedQuantity: item.quantity,
        unitName: item.unitName || 'Cái',
        actualReceivedQuantity: item.quantity, // mặc định bằng số lượng mong đợi
        physicalStatus: 'Tốt',
        expiryDate: '',
        // fields cho biên bản chênh lệch
        reason: '',
        action: ''
      }))
    }
  } catch (err) {
    error.value = err.message || 'Lỗi tải dữ liệu phiếu nhập'
  } finally {
    loading.value = false
  }
}

async function handleArrival() {
  submitting.value = true
  error.value = ''
  successMessage.value = ''
  try {
    await confirmArrival(props.receiptId)
    successMessage.value = 'Đã xác nhận hàng về thành công.'
    await loadData()
  } catch (err) {
    error.value = err.message || 'Lỗi khi xác nhận hàng về'
  } finally {
    submitting.value = false
  }
}

async function handleComplete() {
  submitting.value = true
  error.value = ''
  successMessage.value = ''
  try {
    if (inspectItems.value.length === 0) {
      error.value = 'Không có sản phẩm nào để kiểm tra.'
      return
    }

    const invalidItem = inspectItems.value.find(item => {
      if (item.actualReceivedQuantity === '' || item.actualReceivedQuantity == null) return true
      const qty = Number(item.actualReceivedQuantity)
      return !Number.isFinite(qty) || qty < 0
    })

    if (invalidItem) {
      error.value = `Số lượng thực nhận của "${invalidItem.productName}" không hợp lệ.`
      return
    }

    // 1. Chuẩn bị payload inspect
    const inspectPayload = {
      items: inspectItems.value.map(item => ({
        productId: item.productId,
        actualReceivedQuantity: Number(item.actualReceivedQuantity),
        physicalStatus: item.physicalStatus,
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : null
      }))
    }

    // 2. Nếu có chênh lệch, tạo biên bản chênh lệch trước
    if (hasDiscrepancy.value) {
      const discrepancyPayload = {
        note: discrepancyNote.value,
        items: discrepancyItems.value.map(item => ({
          productId: item.productId,
          reason: item.reason,
          action: item.action
        }))
      }
      await createDiscrepancyReport(props.receiptId, discrepancyPayload)
    }

    // 3. Hoàn tất (ACID transaction)
    await completeImport(props.receiptId, inspectPayload)
    
    successMessage.value = 'Đã hoàn tất nhập kho thành công.'
    await loadData()
  } catch (err) {
    error.value = err.message || 'Lỗi khi hoàn tất phiếu nhập'
  } finally {
    submitting.value = false
  }
}

function formatCurrency(value) {
  if (value == null) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('vi-VN')
}

watch(() => props.receiptId, loadData, { immediate: true })
</script>

<template>
  <div v-if="loading" class="d-flex justify-center my-8">
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
  </div>
  
  <div v-else-if="receipt">
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-alert v-if="successMessage" type="success" variant="tonal" class="mb-4" closable @click:close="successMessage = ''">
      {{ successMessage }}
    </v-alert>

    <!-- Thông tin chung -->
    <v-card class="mb-6 rounded-lg elevation-1" border>
      <v-card-title class="font-weight-bold d-flex align-center">
        <span>Phiếu Nhập: {{ receipt.code }}</span>
        <v-spacer></v-spacer>
        <v-chip :color="statusColor" class="font-weight-medium">{{ statusLabel }}</v-chip>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <div class="text-caption text-grey">Kho hàng</div>
            <div class="font-weight-medium">{{ receipt.warehouseName || '-' }}</div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="text-caption text-grey">Nhà cung cấp</div>
            <div class="font-weight-medium">{{ receipt.supplierName || '-' }}</div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="text-caption text-grey">Tổng tiền</div>
            <div class="font-weight-medium text-error">{{ formatCurrency(receipt.totalAmount) }}</div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="text-caption text-grey">Ngày tạo</div>
            <div class="font-weight-medium">{{ formatDate(receipt.createdAt) }}</div>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions v-if="receipt.status === 'CHO_HANG_VE' && canProcessReceipt" class="bg-grey-lighten-4 pa-4 border-top">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="flat" :loading="submitting" @click="handleArrival">
          <v-icon start>mdi-truck-check</v-icon>
          Xác Nhận Hàng Về
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Kiểm hàng thực tế (khi status = CHO_KIEM_HANG) -->
    <v-card v-if="receipt.status === 'CHO_KIEM_HANG' && canProcessReceipt" class="mb-6 rounded-lg elevation-1 border-primary" border>
      <v-card-title class="bg-primary text-white d-flex align-center py-3">
        <v-icon start>mdi-clipboard-check</v-icon>
        Bước 2: Kiểm Hàng Thực Tế
      </v-card-title>
      <v-card-text class="pt-4">
        <v-table hover v-if="inspectItems.length > 0">
          <thead>
            <tr>
              <th class="text-left">Sản phẩm</th>
              <th class="text-center" width="120">SL Gốc</th>
              <th class="text-center" width="150">Thực nhận</th>
              <th class="text-left" width="200">Tình trạng</th>
              <th class="text-left" width="200">Hạn sử dụng</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in inspectItems" :key="item.productId" :class="{'bg-red-lighten-5': item.actualReceivedQuantity !== item.expectedQuantity}">
              <td>
                <div class="font-weight-bold">{{ item.productName }}</div>
                <div class="text-caption text-grey">{{ item.productCode }}</div>
              </td>
              <td class="text-center font-weight-bold">{{ item.expectedQuantity }} {{ item.unitName }}</td>
              <td>
                <v-text-field
                  v-model.number="item.actualReceivedQuantity"
                  type="number"
                  min="0"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="bg-white"
                ></v-text-field>
              </td>
              <td>
                <v-select
                  v-model="item.physicalStatus"
                  :items="physicalStatusOptions"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="bg-white"
                ></v-select>
              </td>
              <td>
                <v-text-field
                  v-model="item.expiryDate"
                  type="date"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="bg-white"
                  clearable
                ></v-text-field>
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-alert v-else type="info" variant="tonal" class="mt-2">
          Không có sản phẩm nào để kiểm tra.
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Biên bản chênh lệch (nếu có lệch) -->
    <v-card v-if="receipt.status === 'CHO_KIEM_HANG' && hasDiscrepancy && canProcessReceipt" class="mb-6 rounded-lg elevation-1 border-error" border>
      <v-card-title class="bg-error text-white d-flex align-center py-3">
        <v-icon start>mdi-alert</v-icon>
        Biên Bản Chênh Lệch
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert type="warning" variant="tonal" class="mb-4">
          Có chênh lệch giữa số lượng thực nhận và số lượng trên phiếu. Vui lòng ghi rõ lý do và hướng xử lý.
        </v-alert>

        <v-textarea
          v-model="discrepancyNote"
          label="Ghi chú tổng quát biên bản"
          variant="outlined"
          rows="2"
          class="mb-4"
        ></v-textarea>

        <div v-for="item in discrepancyItems" :key="item.productId" class="mb-4 pa-4 bg-grey-lighten-4 rounded">
          <div class="font-weight-bold mb-2">
            {{ item.productName }}
            <v-chip size="small" color="error" class="ml-2">Lệch: {{ item.actualReceivedQuantity - item.expectedQuantity }} {{ item.unitName }}</v-chip>
          </div>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="item.reason"
                label="Lý do chênh lệch"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="item.action"
                label="Hướng xử lý đề xuất"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
    </v-card>

    <!-- Nút Action Cuối (CHO_KIEM_HANG) -->
    <div v-if="receipt.status === 'CHO_KIEM_HANG' && canProcessReceipt" class="d-flex justify-end mb-6">
      <v-btn
        color="primary"
        size="large"
        variant="flat"
        :loading="submitting"
        :disabled="inspectItems.length === 0"
        @click="handleComplete"
      >
        <v-icon start>mdi-check-circle</v-icon>
        Hoàn Tất Nhập Kho
      </v-btn>
    </div>

    <!-- Chỉ xem danh sách sản phẩm nếu không ở trạng thái cần action -->
    <v-card v-if="receipt.status !== 'CHO_KIEM_HANG' || !canProcessReceipt" class="mb-6 rounded-lg elevation-1" border>
      <v-card-title class="font-weight-bold bg-grey-lighten-4 py-3">
        Danh sách sản phẩm
      </v-card-title>
      <v-card-text class="pa-0">
        <v-table>
          <thead>
            <tr>
              <th class="text-left">Sản phẩm</th>
              <th class="text-center">Số lượng</th>
              <th class="text-right">Đơn giá</th>
              <th class="text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in receipt.items" :key="item.productId">
              <td>
                <div class="font-weight-bold">{{ item.productName }}</div>
                <div class="text-caption text-grey">{{ item.productCode }}</div>
              </td>
              <td class="text-center font-weight-medium">{{ item.quantity }} {{ item.unitName || 'Cái' }}</td>
              <td class="text-right">{{ formatCurrency(item.unitPrice) }}</td>
              <td class="text-right font-weight-medium text-error">{{ formatCurrency(item.totalPrice) }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </div>

  <div v-else class="d-flex flex-column align-center my-8">
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" max-width="600">
      {{ error }}
    </v-alert>
    <v-btn color="primary" @click="loadData">
      <v-icon start>mdi-reload</v-icon>
      Tải lại
    </v-btn>
  </div>
</template>
