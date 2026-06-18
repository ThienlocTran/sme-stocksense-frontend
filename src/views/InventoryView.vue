<script setup>
import PageHeader from '../components/PageHeader.vue'
import FeaturePending from '../components/FeaturePending.vue'
</script>

<template>
  <PageHeader title="Tồn kho" description="Tra cứu số lượng tồn theo sản phẩm và kho." />
  <FeaturePending title="Chưa có API tồn kho" description="Màn hình này không hiển thị dữ liệu tồn kho mô phỏng trong luồng production." />
</template>
