<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { getAssignment, retryEmail } from "../services/aiPurchaseAssignmentService";
import { getCurrentRoleCode, getCurrentUser } from "../services/authService";
import { canManageAiPurchaseEmails } from "../services/permissionService";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const assignmentId = route.params.id;
const assignment = ref(null);
const isLoading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const isRetryingEmail = ref(false);

const currentUser = getCurrentUser();
const currentRole = getCurrentRoleCode();

const isReceiver = computed(() => {
  if (!assignment.value) return false;
  if (!currentUser) return false;
  return Number(assignment.value.receiverId) === Number(currentUser.employeeId);
});

const isEmployee = computed(() => currentRole === "EMPLOYEE");
const canManageEmails = computed(() => canManageAiPurchaseEmails(currentRole));

// Check if email retry is allowed: must not be DA_GUI, and must be CHO_GUI or THAT_BAI
const canRetry = computed(() => {
  if (!assignment.value) return false;
  return canManageEmails.value && 
         (assignment.value.emailStatus === "CHO_GUI" || assignment.value.emailStatus === "THAT_BAI");
});

async function loadAssignment() {
  isLoading.value = true;
  errorMessage.value = "";
  assignment.value = null; // Clear previous assignment data while loading new ID
  try {
    const data = await getAssignment(assignmentId);
    assignment.value = data;
  } catch (err) {
    errorMessage.value = err.message || t("forecast.assignment.errorLoading");
  } finally {
    isLoading.value = false;
  }
}

async function handleRetryEmail() {
  if (!canRetry.value) return;
  isRetryingEmail.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const data = await retryEmail(assignmentId);
    if (data) {
      assignment.value = data;
    } else {
      await loadAssignment();
    }
    successMessage.value = t("forecast.assignment.retrySuccess");
  } catch (err) {
    errorMessage.value = err.message || t("forecast.assignment.retryFailed");
  } finally {
    isRetryingEmail.value = false;
  }
}

function goBack() {
  router.push("/ai-purchase-assignments");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", { hour12: false });
}

function formatQty(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function statusLabel(status) {
  if (status === "DA_GUI") return t("forecast.assignment.status_DA_GUI") || "Đã giao việc";
  if (status === "DA_TIEP_NHAN") return t("forecast.assignment.status_DA_TIEP_NHAN") || "Đã tiếp nhận";
  if (status === "DA_TAO_PHIEU") return t("forecast.assignment.status_DA_TAO_PHIEU") || "Đã tạo phiếu";
  if (status === "DA_HOAN_THANH") return t("forecast.assignment.status_DA_HOAN_THANH") || "Đã hoàn thành";
  if (status === "HUY") return t("forecast.assignment.status_HUY") || "Đã hủy";
  return status || "—";
}

function emailStatusLabel(status) {
  if (status === "DA_GUI") return t("forecast.assignment.emailStatus_DA_GUI") || "Đã gửi";
  if (status === "THAT_BAI") return t("forecast.assignment.emailStatus_THAT_BAI") || "Gửi thất bại";
  if (status === "CHO_GUI") return t("forecast.assignment.emailStatus_CHO_GUI") || "Chờ gửi";
  return status || t("common.unknown") || "Không xác định";
}

function emailStatusClass(status) {
  if (status === "DA_GUI") return "badge-sent";
  if (status === "THAT_BAI") return "badge-failed";
  if (status === "CHO_GUI") return "badge-pending";
  return "badge-pending";
}

function importReceiptStatusLabel(status) {
  const mapping = {
    NHAP: t('stockDocument.status.draft') || 'Nháp',
    CHO_DUYET_CAP_1: t('stockDocument.status.pending') || 'Chờ duyệt',
    CHO_DUYET_CAP_2: t('stockDocument.status.pending') || 'Chờ duyệt',
    CHO_HANG_VE: t('stockDocument.status.pending_delivery') || 'Chờ hàng về',
    CHO_KIEM_HANG: t('stockDocument.status.pending_inspection') || 'Chờ kiểm hàng',
    HOAN_THANH: t('stockDocument.status.completed') || 'Hoàn thành',
    TU_CHOI: t('stockDocument.status.rejected') || 'Từ chối',
    HUY: t('stockDocument.status.cancelled') || 'Đã hủy'
  }
  return mapping[status] || status || '—';
}

function goCreateReceipt() {
  router.push(`/stock-in/create?aiPurchaseRequestId=${assignmentId}`);
}

function goViewReceipt() {
  if (assignment.value?.importReceiptId) {
    router.push(`/stock-in/${assignment.value.importReceiptId}`);
  }
}

onMounted(() => {
  loadAssignment();
});
</script>

<template>
  <div class="page-container page-shell">
    <PageHeader
      :title="t('forecast.assignment.detailTitle')"
      :description="t('forecast.assignment.pageDesc')"
    >
      <button class="btn btn-secondary" type="button" @click="goBack">
        <i class="mdi mdi-arrow-left"></i> {{ t('forecast.assignment.backToList') }}
      </button>
    </PageHeader>

    <!-- Error Alert -->
    <p v-if="errorMessage" class="error-alert card card-pad">
      <i class="mdi mdi-alert-circle text-lg"></i>
      <span>{{ errorMessage }}</span>
    </p>

    <!-- Success Alert -->
    <p v-if="successMessage" class="success-alert card card-pad">
      <i class="mdi mdi-check-circle text-lg"></i>
      <span>{{ successMessage }}</span>
    </p>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state card card-pad">
      <i class="mdi mdi-loading mdi-spin text-2xl text-indigo-600"></i>
      <span>{{ t('forecast.assignment.loadingDetail') }}</span>
    </div>

    <div v-else-if="assignment" class="space-y-6 animate-in fade-in duration-200">
      <!-- Top Action Bar for Employee CTA -->
      <div v-if="isReceiver && isEmployee && !assignment.importReceiptId" class="card card-pad bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-900/30 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 class="text-sm font-bold text-indigo-900 dark:text-indigo-300">
            {{ t('forecast.assignment.receiver') }}
          </h3>
          <p class="text-xs text-zinc-500 mt-1">
            Bạn đã được bàn giao nhiệm vụ này. Vui lòng tiến hành tạo phiếu nhập kho.
          </p>
        </div>
        <button class="btn btn-primary" type="button" @click="goCreateReceipt">
          <i class="mdi mdi-plus-box"></i> {{ t('forecast.assignment.createReceipt') }}
        </button>
      </div>

      <!-- Main Layout Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left 2 columns -->
        <div class="lg:col-span-2 space-y-6">
          <!-- SECTION 2: Goods Info -->
          <div class="card card-pad">
            <h2 class="section-title mb-4 flex items-center gap-2">
              <i class="mdi mdi-package-variant-closed text-indigo-600"></i>
              {{ t('forecast.assignment.sectionItemInfo') }}
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div class="detail-item">
                <span class="text-zinc-500 block mb-1">{{ t('stockDocument.columns.product') }}</span>
                <strong class="text-zinc-950 dark:text-zinc-50">
                  [{{ assignment.productCode }}] {{ assignment.productName }}
                </strong>
              </div>
              <div class="detail-item">
                <span class="text-zinc-500 block mb-1">{{ t('stockDocument.columns.warehouse') }}</span>
                <strong class="text-zinc-950 dark:text-zinc-50">
                  [{{ assignment.warehouseCode }}] {{ assignment.warehouseName }}
                </strong>
              </div>
              <div class="detail-item">
                <span class="text-zinc-500 block mb-1">{{ t('forecast.assignment.supplier') }}</span>
                <strong class="text-zinc-950 dark:text-zinc-50">
                  {{ assignment.supplierName || t('forecast.assignment.supplierUnknown') }}
                </strong>
              </div>
              <div class="detail-item">
                <span class="text-zinc-500 block mb-1">{{ t('forecast.assignment.forecastHorizon') }}</span>
                <strong class="text-zinc-950 dark:text-zinc-50">
                  {{ assignment.horizonDays }} {{ t('forecast.daysCount', { days: assignment.horizonDays }).replace(/[0-9]/g, '').trim() }}
                </strong>
              </div>
            </div>
          </div>

          <!-- SECTION 3: Decision values (visually strong) -->
          <div class="card card-pad">
            <h2 class="section-title mb-4 flex items-center gap-2">
              <i class="mdi mdi-scale-balance text-indigo-600"></i>
              {{ t('forecast.assignment.sectionDecisions') }}
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- AI Recommendation -->
              <div class="p-4 bg-indigo-50/20 dark:bg-indigo-950/5 rounded border border-indigo-100 dark:border-indigo-900/10 flex flex-col justify-between">
                <div>
                  <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                    {{ t('forecast.assignment.aiSuggested') }}
                  </span>
                  <p class="text-xs text-zinc-500">
                    {{ t('forecast.assignment.aiQtyDescription') }}
                  </p>
                </div>
                <strong class="text-3xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-4 tabular-num">
                  {{ formatQty(assignment.aiSuggestedQuantity) }}
                </strong>
              </div>

              <!-- Human Requested -->
              <div class="p-4 bg-zinc-50 dark:bg-zinc-800/10 rounded border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                  <span class="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                    {{ t('forecast.assignment.managerRequested') }}
                  </span>
                  <p class="text-xs text-zinc-500">
                    {{ t('forecast.assignment.requestedQtyDescription') }}
                  </p>
                </div>
                <strong class="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-4 tabular-num">
                  {{ formatQty(assignment.requestedQuantity) }}
                </strong>
              </div>
            </div>
          </div>

          <!-- SECTION 4: Directive instructions -->
          <div class="card card-pad">
            <h2 class="section-title mb-3 flex items-center gap-2">
              <i class="mdi mdi-comment-text-outline text-indigo-600"></i>
              {{ t('forecast.assignment.sectionDirective') }}
            </h2>
            <div class="p-4 bg-zinc-50 dark:bg-zinc-800/20 rounded border border-zinc-200 dark:border-zinc-800 text-sm whitespace-pre-line leading-relaxed min-h-[80px]">
              {{ assignment.content || t('forecast.assignment.noDirective') }}
            </div>
          </div>
        </div>

        <!-- Right 1 column -->
        <div class="space-y-6">
          <!-- SECTION 1: Task General Info & Status -->
          <div class="card card-pad">
            <h2 class="section-title mb-4 flex items-center gap-2">
              <i class="mdi mdi-information-outline text-indigo-600"></i>
              {{ t('forecast.assignment.sectionTaskInfo') }}
            </h2>
            <div class="space-y-3.5 text-sm">
              <div class="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                <span class="text-zinc-500">{{ t('forecast.assignment.code') }}</span>
                <strong class="text-zinc-900 dark:text-zinc-50 font-mono">{{ assignment.code }}</strong>
              </div>
              <div class="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                <span class="text-zinc-500">{{ t('forecast.assignment.status') }}</span>
                <StatusBadge :status="statusLabel(assignment.status)" />
              </div>
              <div class="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                <span class="text-zinc-500">{{ t('forecast.assignment.sender') }}</span>
                <strong class="text-zinc-900 dark:text-zinc-50">{{ assignment.senderName || '—' }}</strong>
              </div>
              <div class="py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                <span class="text-zinc-500 block mb-1">{{ t('forecast.assignment.receiver') }}</span>
                <div>
                  <strong class="text-zinc-900 dark:text-zinc-50 block">{{ assignment.receiverName || '—' }}</strong>
                  <span class="text-xs text-zinc-400 font-mono" v-if="assignment.receiverEmail">{{ assignment.receiverEmail }}</span>
                </div>
              </div>
              <div class="flex justify-between items-center py-1.5">
                <span class="text-zinc-500">{{ t('forecast.assignment.createdTime') }}</span>
                <span class="text-zinc-600 dark:text-zinc-300 text-xs font-semibold">{{ formatDate(assignment.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- SECTION 5: Inbound Linkage -->
          <div class="card card-pad">
            <h2 class="section-title mb-4 flex items-center gap-2">
              <i class="mdi mdi-link-variant text-indigo-600"></i>
              {{ t('forecast.assignment.sectionLinkage') }}
            </h2>
            <div class="space-y-4">
              <div v-if="!assignment.importReceiptId" class="space-y-3">
                <div class="text-zinc-500 text-sm italic">
                  {{ t('forecast.assignment.noReceiptLinked') }}
                </div>
                <!-- Action for Employee assigned -->
                <button v-if="isReceiver && isEmployee" class="btn btn-primary btn-sm w-full justify-center" type="button" @click="goCreateReceipt">
                  <i class="mdi mdi-plus-box"></i> {{ t('forecast.assignment.createReceipt') }}
                </button>
              </div>
              <div v-else class="space-y-3.5 text-sm">
                <div class="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span class="text-zinc-500">Mã phiếu nhập:</span>
                  <strong class="text-zinc-900 dark:text-zinc-50 font-mono">{{ assignment.importReceiptCode }}</strong>
                </div>
                <div class="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span class="text-zinc-500">Trạng thái phiếu:</span>
                  <StatusBadge :status="importReceiptStatusLabel(assignment.importReceiptStatus)" />
                </div>
                <button class="btn btn-secondary btn-sm w-full justify-center mt-2" type="button" @click="goViewReceipt">
                  <i class="mdi mdi-eye-outline mr-1"></i> {{ t('forecast.assignment.viewReceipt') }}
                </button>
              </div>
            </div>
          </div>

          <!-- SECTION 6: Email Notification -->
          <div class="card card-pad">
            <h2 class="section-title mb-4 flex items-center gap-2">
              <i class="mdi mdi-email-outline text-indigo-600"></i>
              {{ t('forecast.assignment.sectionEmail') }}
            </h2>
            <div class="space-y-4 text-sm">
              <div class="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                <span class="text-zinc-500">{{ t('forecast.assignment.emailStatus') }}</span>
                <span class="email-badge" :class="emailStatusClass(assignment.emailStatus)">
                  {{ emailStatusLabel(assignment.emailStatus) }}
                </span>
              </div>
              <div class="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/60" v-if="assignment.emailSentAt">
                <span class="text-zinc-500">{{ t('forecast.assignment.emailSentAt') }}</span>
                <span class="text-xs font-semibold">{{ formatDate(assignment.emailSentAt) }}</span>
              </div>
              <div class="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded text-xs border border-red-200 dark:border-red-900/30 whitespace-pre-wrap leading-relaxed" v-if="assignment.emailError && assignment.emailStatus === 'THAT_BAI'">
                <strong>Lỗi gửi nhận:</strong> {{ assignment.emailError }}
              </div>

              <!-- Admin/Manager retry action -->
              <button 
                v-if="canRetry"
                class="btn btn-warning btn-sm w-full justify-center gap-1.5"
                type="button"
                :disabled="isRetryingEmail"
                @click="handleRetryEmail"
              >
                <i class="mdi" :class="isRetryingEmail ? 'mdi-loading mdi-spin' : 'mdi-email-sync-outline'"></i>
                {{ isRetryingEmail ? t('forecast.assignment.resendingEmail') : t('forecast.assignment.resendEmail') }}
              </button>
            </div>
          </div>

          <!-- SECTION 7: AI Trace (Technical trace context) -->
          <div class="card card-pad bg-zinc-50/50 dark:bg-zinc-800/5 text-xs border border-dashed border-zinc-200 dark:border-zinc-800">
            <h2 class="section-title mb-3 flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
              <i class="mdi mdi-database-eye text-base"></i>
              {{ t('forecast.assignment.sectionTrace') }}
            </h2>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-zinc-500">{{ t('forecast.assignment.dataSource') }}:</span>
                <span class="font-medium text-zinc-700 dark:text-zinc-300">{{ assignment.source }}</span>
              </div>
              <div class="flex justify-between" v-if="assignment.modelVersion != null">
                <span class="text-zinc-500">{{ t('forecast.assignment.modelVersion') }}:</span>
                <span class="font-medium text-zinc-700 dark:text-zinc-300">v{{ assignment.modelVersion }}</span>
              </div>
              <div class="flex justify-between" v-if="assignment.modelMetadataId != null">
                <span class="text-zinc-500">{{ t('forecast.assignment.modelMetadataId') }}:</span>
                <span class="font-mono text-zinc-600 dark:text-zinc-400">#{{ assignment.modelMetadataId }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.error-alert {
  background: var(--color-danger-soft);
  border: 1px solid rgba(220, 38, 38, 0.2);
  color: var(--color-danger);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.success-alert {
  background: var(--color-success-soft);
  border: 1px solid rgba(22, 130, 93, 0.2);
  color: var(--color-success);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.email-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.badge-sent {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.badge-failed {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.badge-pending {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.btn-warning {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
  font-weight: 600;
}

.btn-warning:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.2);
}

.btn-warning:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tabular-num {
  font-variant-numeric: tabular-nums;
}
</style>
