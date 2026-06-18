<script setup>
import PageHeader from '../components/PageHeader.vue'
import FeaturePending from '../components/FeaturePending.vue'

defineProps({ type: { type: String, default: 'in' } })
</script>

<template>
  <PageHeader :title="type === 'out' ? 'Phiếu xuất kho' : 'Phiếu nhập kho'" description="Danh sách chứng từ kho từ API backend." />
  <FeaturePending title="Chưa có API chứng từ kho" description="Không hiển thị phiếu nhập/xuất mô phỏng trong luồng production." />
</template>
