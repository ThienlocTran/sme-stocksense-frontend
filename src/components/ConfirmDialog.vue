<script setup>
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Xác nhận' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Xác nhận' },
  danger: { type: Boolean, default: false },
})
defineEmits(['cancel', 'confirm'])
</script>

<template>
  <div v-if="open" class="modal-backdrop">
    <div class="modal small-modal">
      <div class="modal-head between">
        <h2 class="section-title">{{ title }}</h2>
        <button class="btn btn-icon" @click="$emit('cancel')" aria-label="Đóng"><i class="mdi mdi-close"></i></button>
      </div>
      <div class="modal-body">
        <p class="muted">{{ message }}</p>
        <slot />
      </div>
      <div class="modal-foot">
        <button class="btn" @click="$emit('cancel')">Hủy</button>
        <button class="btn" :class="danger ? 'btn-danger' : 'btn-primary'" @click="$emit('confirm')">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.small-modal { width: min(460px, 100%); }
</style>
