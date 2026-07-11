<script setup>
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import ImportInspectionPanel from '../components/ImportInspectionPanel.vue'
import { getExportReceipt } from '../services/exportReceiptService'

const props = defineProps({
  type: { type: String, default: 'in' },
  id: { type: String, default: '' }
})

const hasReceiptId = computed(() => String(props.id || '').trim().length > 0)
const receipt = ref(null)
const loading = ref(false)
const error = ref('')
onMounted(async () => {
  if (props.type !== 'out' || !hasReceiptId.value) return
  loading.value = true
  try { receipt.value = await getExportReceipt(props.id) } catch (e) { error.value = e.message } finally { loading.value = false }
})
const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`
</script>

<template>
  <PageHeader
    :title="type === 'out' ? 'Chi tiết phiếu xuất kho' : 'Chi tiết phiếu nhập kho'"
    :description="type === 'out' ? 'Chi tiết chứng từ xuất kho.' : 'Chi tiết, xác nhận và kiểm hàng phiếu nhập kho.'"
  />

  <div class="mt-6">
    <template v-if="type === 'in'">
      <ImportInspectionPanel v-if="hasReceiptId" :receiptId="id" />
      <div v-else class="card card-pad">
        <p class="form-alert form-alert-error mb-0">Không tìm thấy mã phiếu nhập để tải chi tiết.</p>
      </div>
    </template>
    <template v-else>
      <p v-if="loading" class="muted">Đang tải chi tiết...</p>
      <p v-else-if="error" class="form-alert form-alert-error">{{ error }}</p>
      <div v-else-if="receipt" class="card card-pad">
        <p><b>Mã phiếu:</b> {{ receipt.code }} · <b>Trạng thái:</b> {{ receipt.status }}</p>
        <p><b>Kho:</b> {{ receipt.warehouseName }} · <b>Đối tác:</b> {{ receipt.partnerName || '-' }} · <b>Tổng:</b> {{ money(receipt.totalAmount) }}</p>
        <table class="data-table"><thead><tr><th>Mã SP</th><th>Sản phẩm</th><th>Số lượng</th><th>Tồn</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
          <tbody><tr v-for="item in receipt.items" :key="item.id"><td>{{ item.productCode }}</td><td>{{ item.productName }}</td><td>{{ item.quantity }}</td><td>{{ item.currentInventory }}</td><td>{{ money(item.unitPrice) }}</td><td>{{ money(item.lineTotal) }}</td></tr></tbody>
        </table>
      </div>
    </template>
  </div>
</template>
