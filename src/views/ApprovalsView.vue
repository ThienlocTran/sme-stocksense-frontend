<script setup>
import PageHeader from '../components/PageHeader.vue'
import FeaturePending from '../components/FeaturePending.vue'
</script>

<template>
  <PageHeader title="Chờ duyệt" description="Danh sách phiếu chờ duyệt từ backend." />
  <FeaturePending title="Chưa có API duyệt phiếu" description="Không hiển thị phiếu duyệt mô phỏng trong luồng production." />
</template>
