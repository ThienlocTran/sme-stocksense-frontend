<script setup>
import PageHeader from '../components/PageHeader.vue'
import FeaturePending from '../components/FeaturePending.vue'
import ImportInspectionPanel from '../components/ImportInspectionPanel.vue'

defineProps({
  type: { type: String, default: 'in' },
  id: { type: String, default: '' }
})
</script>

<template>
  <PageHeader
    :title="type === 'out' ? 'Chi tiết phiếu xuất kho' : 'Chi tiết phiếu nhập kho'"
    :description="type === 'out' ? 'Chi tiết chứng từ xuất kho.' : 'Chi tiết, xác nhận và kiểm hàng phiếu nhập kho.'"
  />

  <div class="mt-6">
    <template v-if="type === 'in'">
      <ImportInspectionPanel :receiptId="id" />
    </template>
    <template v-else>
      <FeaturePending title="Chưa có màn hình chi tiết phiếu xuất kho" />
    </template>
  </div>
</template>
