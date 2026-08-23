<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getImportReceiptHistory } from '../services/importReceiptService'
import { getExportReceiptHistory } from '../services/exportReceiptService'

const props = defineProps({
  receiptId: {
    type: Number,
    default: null,
  },
  receiptCode: {
    type: String,
    default: '',
  },
  documentType: {
    type: String,
    default: 'in',
  },
})

const emit = defineEmits(['close'])

const { t } = useI18n()
const historyList = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

function translateError(msg) {
  if (!msg) return ""
  const cleaned = String(msg).trim()
  if (cleaned.includes("Nguoi duyet cap 2 phai khac nguoi da duyet cap 1") || cleaned.includes("nguyen tac 4 mat")) {
    return t("approvals.messages.fourEyesError")
  }
  if (cleaned.includes("Nguoi tao phieu khong duoc tu duyet phieu") || cleaned.includes("Nguoi gui duyet khong duoc tu duyet phieu")) {
    return t("approvals.messages.creatorCannotApprove")
  }
  if (cleaned.includes("System error. Please try again later.")) {
    return t("common.systemError")
  }
  return msg
}

watch(
  () => props.receiptId,
  async (id) => {
    if (!id) return
    isLoading.value = true
    errorMessage.value = ''
    historyList.value = []
    try {
      historyList.value = await (props.documentType === 'out' ? getExportReceiptHistory : getImportReceiptHistory)(id)
    } catch (err) {
      errorMessage.value = err.message || t('approvals.messages.loadDetailError')
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true },
)

const ACTION_LABELS = computed(() => ({
  GUI_DUYET: t('stockDocument.actionSubmit'),
  DUYET: t('approvals.actions.approve'),
  DUYET_CAP_1: t('approvals.actions.approveLevel', { level: 1 }),
  DUYET_CAP_2: t('approvals.actions.approveLevel', { level: 2 }),
  TU_CHOI: t('stockDocument.status.rejected'),
  HUY: t('stockDocument.actionCancel'),
}))

const ACTION_ICONS = {
  GUI_DUYET: '📤',
  DUYET_CAP_1: '✅',
  DUYET_CAP_2: '✅',
  TU_CHOI: '❌',
  HUY: '🚫',
}

const ACTION_CLASSES = {
  GUI_DUYET: 'action-submit',
  DUYET_CAP_1: 'action-approve',
  DUYET_CAP_2: 'action-approve',
  TU_CHOI: 'action-reject',
  HUY: 'action-cancel',
}

function actionLabel(action) {
  return ACTION_LABELS.value[action] || action
}
function actionIcon(action) {
  return ACTION_ICONS[action] || '📌'
}
function actionClass(action) {
  return ACTION_CLASSES[action] || 'action-default'
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>

<template>
  <div class="modal-backdrop" @mousedown.self="$emit('close')">
    <div class="modal history-modal">
      <div class="modal-head between">
        <h2 class="modal-title">
          <span class="title-icon">🕐</span>
          {{ t('approvals.approvalHistoryTitle') }}
          <span v-if="receiptCode" class="receipt-code-tag">{{ receiptCode }}</span>
        </h2>
        <button class="btn btn-icon" :aria-label="t('common.close')" @click="$emit('close')">
          <i class="mdi mdi-close" />
        </button>
      </div>

      <div class="modal-body">
        <p v-if="isLoading" class="loading-text">
          <span class="spin">⏳</span> {{ t('approvals.loadingHistory') }}
        </p>
        <p v-else-if="errorMessage" class="error-msg">{{ translateError(errorMessage) }}</p>

        <div v-else-if="historyList.length === 0" class="empty-state">
          <span class="empty-icon">📋</span>
          <p>{{ t('approvals.emptyHistory') }}</p>
        </div>

        <div v-else class="timeline">
          <div
            v-for="(item, index) in historyList"
            :key="item.id"
            class="timeline-item"
            :class="{ 'timeline-last': index === historyList.length - 1 }"
          >
            <div class="timeline-connector">
              <div class="timeline-dot" :class="actionClass(item.action)">
                {{ actionIcon(item.action) }}
              </div>
              <div v-if="index < historyList.length - 1" class="timeline-line" />
            </div>

            <div class="timeline-content">
              <div class="timeline-header">
                <span class="action-badge" :class="actionClass(item.action)">
                  {{ actionLabel(item.action) }}
                </span>
                <span class="timeline-time">{{ formatDateTime(item.createdAt) }}</span>
              </div>
              <div class="timeline-actor">
                <span class="actor-avatar">{{ (item.actorName || '?')[0].toUpperCase() }}</span>
                <span class="actor-name">{{ item.actorName || t('common.unknown') }}</span>
              </div>
              <div v-if="item.note" class="timeline-note">
                <span class="note-label">{{ t('importInspection.reasonLabel') }}</span> {{ item.note }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-foot modal-foot-end">
        <button class="btn" type="button" @click="$emit('close')">{{ t('common.close') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-modal {
  width: min(560px, 96vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  margin: 0;
}

.title-icon {
  font-size: 18px;
}

.receipt-code-tag {
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid #bfdbfe;
}

.modal-body {
  overflow-y: auto;
  flex: 1;
  padding: 20px 24px;
}

.modal-foot-end {
  justify-content: flex-end;
}

.loading-text {
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
}

.spin {
  display: inline-block;
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-msg {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #94a3b8;
}

.empty-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 8px;
}

/* === Timeline === */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.timeline-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 36px;
}

.timeline-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  background: #f1f5f9;
  border: 2px solid #e2e8f0;
  z-index: 1;
}

.timeline-line {
  width: 2px;
  flex: 1;
  min-height: 24px;
  background: #e2e8f0;
  margin: 4px 0;
}

.timeline-content {
  flex: 1;
  padding-bottom: 20px;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.action-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 800;
}

.timeline-time {
  font-size: 12px;
  color: #94a3b8;
}

.timeline-actor {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.actor-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.actor-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.timeline-note {
  margin-top: 4px;
  background: var(--color-warning-soft);
  border: 1px solid var(--color-warning);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--color-warning);
  line-height: 1.5;
}

.note-label {
  font-weight: 700;
}

/* Action color variants */
.action-submit .timeline-dot,
.action-submit {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-approve .timeline-dot,
.action-approve {
  background: var(--color-success-soft);
  border-color: var(--color-success);
  color: var(--color-success);
}

.action-reject .timeline-dot,
.action-reject {
  background: var(--color-danger-soft);
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.action-cancel .timeline-dot,
.action-cancel {
  background: var(--color-bg);
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}
</style>
