<script setup>
import { onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "" },
  message: { type: String, default: "" },
  confirmText: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  danger: { type: Boolean, default: false },
});
const emit = defineEmits(["cancel", "confirm"]);
const { t } = useI18n();

function handleKeydown(event) {
  if (event.key === "Escape" && !props.loading) emit("cancel");
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeydown);
    } else {
      window.removeEventListener("keydown", handleKeydown);
    }
  },
);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop"
    @click.self="!loading && $emit('cancel')"
  >
    <div class="modal small-modal">
      <div class="modal-head between">
        <div>
          <h2 class="section-title">{{ title || t('common.confirm') }}</h2>
          <p class="modal-subtitle">
            {{ t('common.confirmActionSubtitle') }}
          </p>
        </div>
        <button
          class="btn btn-icon"
          :disabled="loading"
          @click="$emit('cancel')"
          :aria-label="t('common.close')"
        >
          <i class="mdi mdi-close"></i>
        </button>
      </div>
      <div class="modal-body">
        <p class="modal-message">{{ message }}</p>
        <slot />
      </div>
      <div class="modal-foot">
        <button
          class="btn btn-ghost"
          :disabled="loading"
          @click="$emit('cancel')"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          class="btn"
          :class="danger ? 'btn-danger' : 'btn-primary'"
          :disabled="loading"
          @click="$emit('confirm')"
        >
          <i v-if="loading" class="mdi mdi-loading mdi-spin"></i>
          {{ loading ? t('common.loading') : (confirmText || t('common.confirm')) }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.small-modal {
  width: min(460px, 100%);
}

.modal-subtitle {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.modal-message {
  margin: 0;
  color: var(--text);
  line-height: 1.6;
}

.mdi-spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
