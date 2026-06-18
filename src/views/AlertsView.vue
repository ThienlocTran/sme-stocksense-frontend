<script setup>
import PageHeader from '../components/PageHeader.vue'
import FeaturePending from '../components/FeaturePending.vue'
</script>

<template>
  <PageHeader title="Cảnh báo tồn kho" description="Cảnh báo tồn kho thấp từ dữ liệu backend." />
  <FeaturePending title="Chưa có API cảnh báo" description="Không hiển thị cảnh báo mô phỏng trong luồng production." />
</template>
