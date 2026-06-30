<script setup>
import { watch, onUnmounted } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Xác nhận' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Xác nhận' },
  danger: { type: Boolean, default: false },
})
const emit = defineEmits(['cancel', 'confirm'])

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    emit('cancel')
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    window.addEventListener('keydown', handleKeyDown)
  } else {
    window.removeEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <Transition name="confirm-modal">
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
  </Transition>
</template>

<style scoped>
.small-modal {
  width: min(460px, 100%);
  transform: scale(1) translateY(0);
}

.confirm-modal-enter-active,
.confirm-modal-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-modal-enter-from,
.confirm-modal-leave-to {
  opacity: 0;
}

.confirm-modal-enter-active .small-modal,
.confirm-modal-leave-active .small-modal {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}

.confirm-modal-enter-from .small-modal,
.confirm-modal-leave-to .small-modal {
  transform: scale(0.96) translateY(8px);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .confirm-modal-enter-active,
  .confirm-modal-leave-active,
  .confirm-modal-enter-active .small-modal,
  .confirm-modal-leave-active .small-modal {
    transition: none !important;
  }
}
</style>
