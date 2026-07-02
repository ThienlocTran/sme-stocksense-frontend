<script setup>
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Xác nhận' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Xác nhận' },
  danger: { type: Boolean, default: false },
})
const emit = defineEmits(['cancel', 'confirm'])

function handleKeydown(event) {
  if (event.key === 'Escape') emit('cancel')
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    window.addEventListener('keydown', handleKeydown)
  } else {
    window.removeEventListener('keydown', handleKeydown)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="$emit('cancel')">
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
