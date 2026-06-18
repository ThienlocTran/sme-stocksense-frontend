<script setup>
import PageHeader from '../components/PageHeader.vue'
import FeaturePending from '../components/FeaturePending.vue'

defineProps({ type: { type: String, default: 'in' }, id: { type: String, default: '' } })
</script>

<template>
  <PageHeader :title="type === 'out' ? 'Chi tiết phiếu xuất kho' : 'Chi tiết phiếu nhập kho'" description="Chi tiết chứng từ kho từ API backend." />
  <FeaturePending title="Chưa có API chi tiết chứng từ" />
</template>
