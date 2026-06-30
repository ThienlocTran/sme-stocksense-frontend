<script setup>
import { ref, watch } from 'vue'
import { getImportReceiptHistory } from '../services/importReceiptService'

const props = defineProps({
  receiptId: {
    type: Number,
    default: null,
  },
  receiptCode: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close'])

const historyList = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

watch(
  () => props.receiptId,
  async (id) => {
    if (!id) return
    isLoading.value = true
    errorMessage.value = ''
    historyList.value = []
    try {
      historyList.value = await getImportReceiptHistory(id)
    } catch (err) {
      errorMessage.value = err.message || 'Không thể tải lịch sử duyệt.'
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true },
)

const ACTION_LABELS = {
  GUI_DUYET: 'Gửi duyệt',
  DUYET_CAP_1: 'Duyệt cấp 1',
  DUYET_CAP_2: 'Duyệt cấp 2',
  TU_CHOI: 'Từ chối',
  HUY: 'Huỷ phiếu',
}

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
  return ACTION_LABELS[action] || action
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
          Lịch sử duyệt phiếu
          <span v-if="receiptCode" class="receipt-code-tag">{{ receiptCode }}</span>
        </h2>
        <button class="btn btn-icon" aria-label="Đóng" @click="$emit('close')">
          <i class="mdi mdi-close" />
        </button>
      </div>

      <div class="modal-body">
        <p v-if="isLoading" class="loading-text">
          <span class="spin">⏳</span> Đang tải lịch sử...
        </p>
        <p v-else-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

        <div v-else-if="historyList.length === 0" class="empty-state">
          <span class="empty-icon">📋</span>
          <p>Chưa có lịch sử thao tác nào.</p>
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
                <span class="actor-name">{{ item.actorName || 'Không rõ' }}</span>
              </div>
              <div v-if="item.note" class="timeline-note">
                <span class="note-label">Lý do:</span> {{ item.note }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-foot modal-foot-end">
        <button class="btn" type="button" @click="$emit('close')">Đóng</button>
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
  color: #334155;
}

.timeline-note {
  margin-top: 4px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: #78350f;
  line-height: 1.5;
}

.note-label {
  font-weight: 700;
}

/* Action color variants */
.action-submit .timeline-dot,
.action-submit {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.action-approve .timeline-dot,
.action-approve {
  background: #dcfce7;
  border-color: #86efac;
  color: #15803d;
}

.action-reject .timeline-dot,
.action-reject {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}

.action-cancel .timeline-dot,
.action-cancel {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #475569;
}
</style>
