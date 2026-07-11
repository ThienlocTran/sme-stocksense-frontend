<script setup>
import { onMounted, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import ImportInspectionPanel from '../components/ImportInspectionPanel.vue'
import { getExportReceipt } from '../services/exportReceiptService'

const props = defineProps({ type: { type: String, default: 'in' }, id: { type: String, default: '' } })
const receipt = ref(null)
const loading = ref(false)
const error = ref('')
onMounted(async () => {
  if (props.type !== 'out') return
  loading.value = true
  try { receipt.value = await getExportReceipt(props.id) } catch (e) { error.value = e.message } finally { loading.value = false }
})
const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`
</script>

<template>
  <PageHeader :title="type === 'out' ? 'Chi tiết phiếu xuất kho' : 'Chi tiết phiếu nhập kho'" />
  <ImportInspectionPanel v-if="type === 'in'" :receiptId="id" />
  <template v-else>
    <p v-if="loading" class="muted">Đang tải chi tiết...</p><p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="receipt" class="card card-pad">
      <div class="grid"><p><b>Mã phiếu:</b> {{ receipt.code }}</p><p><b>Trạng thái:</b> {{ receipt.status }}</p>
        <p><b>Kho:</b> {{ receipt.warehouseName }}</p><p><b>Đối tác:</b> {{ receipt.partnerName || '-' }}</p>
        <p><b>Người tạo:</b> {{ receipt.createdByName }}</p><p><b>Tổng tiền:</b> {{ money(receipt.totalAmount) }}</p></div>
      <table class="data-table"><thead><tr><th>Mã SP</th><th>Sản phẩm</th><th>Số lượng</th><th>Tồn hiện tại</th><th>Đơn giá</th><th>Thành tiền</th><th>Ghi chú</th></tr></thead>
        <tbody><tr v-for="item in receipt.items" :key="item.id"><td>{{ item.productCode }}</td><td>{{ item.productName }}</td><td>{{ item.quantity }}</td><td :class="{ danger: item.warning }">{{ item.currentInventory }}</td><td>{{ money(item.unitPrice) }}</td><td>{{ money(item.lineTotal) }}</td><td>{{ item.note || '-' }}</td></tr></tbody>
      </table>
    </div>
  </template>
</template>
<style scoped>.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.error,.danger{color:#b91c1c}@media(max-width:640px){.grid{grid-template-columns:1fr}}</style>
