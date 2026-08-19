<script setup>
import markSvgRaw from '../../assets/brand/stocksense-mark.svg?raw'
</script>

<template>
  <div class="stocksense-mark-container" v-html="markSvgRaw"></div>
</template>

<style scoped>
.stocksense-mark-container :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
