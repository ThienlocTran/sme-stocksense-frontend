<script setup>
import PageHeader from '../components/PageHeader.vue'
import FeaturePending from '../components/FeaturePending.vue'

defineProps({ type: { type: String, default: 'in' }, id: { type: String, default: '' }, mode: { type: String, default: 'create' } })
</script>

<template>
  <PageHeader :title="type === 'out' ? 'Tạo phiếu xuất kho' : 'Tạo phiếu nhập kho'" description="Workflow chứng từ kho sẽ dùng API thật." />
  <FeaturePending title="Chức năng chứng từ đang được phát triển" />
</template>
