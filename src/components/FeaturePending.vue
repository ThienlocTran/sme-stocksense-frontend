<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: 'Chức năng đang được phát triển. Dữ liệu sẽ hiển thị khi API backend sẵn sàng.' },
})
</script>

<template>
  <section class="card card-pad pending-state">
    <i class="mdi mdi-progress-wrench"></i>
    <div>
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
    </div>
  </section>
</template>

<style scoped>
.pending-state { display: flex; gap: 14px; align-items: flex-start; color: var(--muted); }
.pending-state i { font-size: 28px; color: var(--primary); }
.pending-state h2 { margin: 0 0 6px; color: var(--text); font-size: 20px; }
.pending-state p { margin: 0; line-height: 22px; }
</style>
