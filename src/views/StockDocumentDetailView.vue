<script setup>
import { computed } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import ImportInspectionPanel from '../components/ImportInspectionPanel.vue'
import StockOutApprovalDetail from '../components/StockOutApprovalDetail.vue'

const props = defineProps({
  type: { type: String, default: 'in' },
  id: { type: String, default: '' },
})

const hasReceiptId = computed(() => String(props.id || '').trim().length > 0)
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
      <StockOutApprovalDetail v-if="hasReceiptId" :receiptId="id" />
      <div v-else class="card card-pad">
        <p class="form-alert form-alert-error mb-0">Không tìm thấy mã phiếu xuất để tải chi tiết.</p>
      </div>
    </template>
  </div>
</template>
