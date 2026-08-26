<script setup>
import { computed, ref, reactive, watch, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth";
import {
  approveExportReceipt,
  getPendingExportApprovalDetail,
  rejectExportReceipt,
  completeExportReceipt,
} from "../services/stockOutApprovalService";
import {
  getExportReceiptHistory,
  exportExportReceiptPdf,
  exportExportReceiptExcel,
} from "../services/exportReceiptService";
import { downloadBlobResponse, setPrintWindowBlob } from "../utils/downloadHelper";
import EmptyState from "./EmptyState.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import StatusBadge from "./StatusBadge.vue";

const props = defineProps({
  receiptId: {
    type: [String, Number],
    required: true,
  },
});

const { t } = useI18n();
const authStore = useAuthStore();
const receipt = ref(null);
const loading = ref(false);
const error = ref("");
let loadDetailRequestId = 0;
const actionMessage = ref("");
const actionError = ref("");
const actionLoading = ref(false);
const historyList = ref([]);
const rejectState = ref({
  open: false,
  reason: "",
  error: "",
  submitting: false,
});
const REJECT_REASON_MAX = 500;

const confirmState = reactive({
  open: false,
  title: "",
  message: "",
  confirmText: t("common.confirm"),
  action: "",
});

const canManageApproval = computed(() =>
  ["ADMIN", "MANAGER"].includes(authStore.currentRole),
);

const canApprove = computed(() => {
  return (
    canManageApproval.value &&
    !actionLoading.value &&
    receipt.value &&
    receipt.value.status === "CHO_DUYET"
  );
});

const isReceiptOwner = computed(() => {
  if (!receipt.value) return false
  const currentUser = authStore.currentUser
  if (!currentUser) return false

  const creatorName = receipt.value.createdByName || receipt.value.createdBy || receipt.value.creatorName || receipt.value.creator
  const creatorId = receipt.value.createdById || receipt.value.creatorId || receipt.value.employeeId

  const matchByName = creatorName && (creatorName === currentUser.fullName || creatorName === currentUser.email)
  const matchById = creatorId && String(creatorId) === String(currentUser.employeeId)

  if (!creatorName && !creatorId) return true

  return Boolean(matchByName || matchById)
})

const canComplete = computed(() => {
  if (actionLoading.value || !receipt.value || receipt.value.status !== "DA_DUYET") {
    return false
  }
  const role = authStore.currentRole
  if (role === 'ADMIN') return true
  if (role === 'EMPLOYEE') {
    return isReceiptOwner.value
  }
  return false
})

const canReject = computed(() => {
  return (
    canManageApproval.value &&
    !actionLoading.value &&
    receipt.value &&
    receipt.value.status === "CHO_DUYET"
  );
});

const overstockItems = computed(() => {
  return (receipt.value?.items || []).filter((item) => {
    const exportQuantity = Number(item.exportQuantity || 0);
    const currentStock = Number(item.currentStock || 0);
    return exportQuantity > currentStock;
  });
});

async function loadDetail() {
  if (!props.receiptId) {
    loadDetailRequestId += 1;
    receipt.value = null;
    error.value = "";
    loading.value = false;
    historyList.value = [];
    return;
  }

  const requestId = ++loadDetailRequestId;
  loading.value = true;
  error.value = "";
  receipt.value = null;
  historyList.value = [];

  try {
    const detail = await getPendingExportApprovalDetail(
      String(props.receiptId),
    );
    if (requestId !== loadDetailRequestId) return;
    receipt.value = detail;

    // Load history
    try {
      historyList.value = await getExportReceiptHistory(String(props.receiptId));
    } catch (histErr) {
      console.error("Failed to load export history", histErr);
    }
  } catch (err) {
    if (requestId !== loadDetailRequestId) return;
    error.value = err.message || "{{ t('stockOutApprovalDetail.messages.loadFailed') }}.";
  } finally {
    if (requestId === loadDetailRequestId) {
      loading.value = false;
    }
  }
}

function triggerApproveConfirm() {
  if (!canApprove.value) return;
  confirmState.title = t("approvals.confirmApprove");
  confirmState.message = t("approvals.approveReceiptQuestion", { code: receipt.value?.code || props.receiptId });
  confirmState.confirmText = t("approvals.actions.approve");
  confirmState.action = "approve";
  confirmState.open = true;
}

function triggerCompleteConfirm() {
  if (!canComplete.value) return;
  confirmState.title = t("approvals.confirmComplete");
  confirmState.message = t("approvals.completeQuestion", { code: receipt.value?.code || props.receiptId });
  confirmState.confirmText = t("approvals.complete");
  confirmState.action = "complete";
  confirmState.open = true;
}

async function executeConfirmedAction() {
  confirmState.open = false;
  actionLoading.value = true;
  actionMessage.value = "";
  actionError.value = "";

  try {
    if (confirmState.action === "approve") {
      const approvedReceipt = await approveExportReceipt(String(props.receiptId));
      receipt.value = approvedReceipt;
      actionMessage.value = t("approvals.messages.approveSuccess", { code: approvedReceipt?.code || props.receiptId });
      await loadDetail();
    } else if (confirmState.action === "complete") {
      const completedReceipt = await completeExportReceipt(String(props.receiptId));
      receipt.value = completedReceipt;
      actionMessage.value = t("approvals.messages.completeSuccess", { code: completedReceipt?.code || props.receiptId });
      await loadDetail();
    }
  } catch (err) {
    actionError.value = err.message || t("approvals.messages.actionFailed");
  } finally {
    actionLoading.value = false;
  }
}

function openRejectModal() {
  rejectState.value = {
    open: true,
    reason: "",
    error: "",
    submitting: false,
  };
}

function closeRejectModal() {
  if (rejectState.value.submitting) return;

  rejectState.value = {
    open: false,
    reason: "",
    error: "",
    submitting: false,
  };
}

async function confirmReject() {
  const reason = rejectState.value.reason.trim();
  if (!reason) {
    rejectState.value.error = t("approvals.messages.rejectReasonRequired");
    return;
  }

  if (reason.length > REJECT_REASON_MAX) {
    rejectState.value.error = t("approvals.messages.rejectReasonMaxLength", { max: REJECT_REASON_MAX });
    return;
  }

  rejectState.value.submitting = true;
  rejectState.value.error = "";
  actionMessage.value = "";
  actionError.value = "";
  actionLoading.value = true;

  try {
    const rejectedReceipt = await rejectExportReceipt(
      String(props.receiptId),
      reason,
    );
    receipt.value = rejectedReceipt;
    rejectState.value = {
      open: false,
      reason: "",
      error: "",
      submitting: false,
    };
    actionMessage.value = t("approvals.messages.rejectSuccessCode", { code: rejectedReceipt?.code || props.receiptId });
    await loadDetail();
  } catch (err) {
    rejectState.value.submitting = false;
    rejectState.value.error = err.message || t("approvals.messages.rejectOutError");
  } finally {
    actionLoading.value = false;
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(status) {
  const statusMap = {
    CHO_DUYET: t('stockDocument.status.pending'),
    DA_DUYET: t('stockDocument.status.approved'),
    HOAN_THANH: t('stockDocument.status.completed'),
    TU_CHOI: t('stockDocument.status.rejected'),
    DA_HUY: t('stockDocument.status.cancelled'),
  };
  return statusMap[status] || status || "-";
}

const statusHelpers = {
  CHO_DUYET: t('stockDocument.statusDesc.pending'),
  DA_DUYET: t('stockDocument.statusDesc.approved'),
  HOAN_THANH: t('stockDocument.statusDesc.completed'),
  TU_CHOI: t('stockDocument.statusDesc.rejected'),
  DA_HUY: t('stockDocument.statusDesc.cancelled'),
};

const ACTION_LABELS = {
  GUI_DUYET: t('stockDocument.actionSubmit'),
  DUYET: t('approvals.actions.approve'),
  DUYET_CAP_1: t('approvals.actions.approveLevel', { level: 1 }),
  DUYET_CAP_2: t('approvals.actions.approveLevel', { level: 2 }),
  TU_CHOI: t('stockDocument.status.rejected'),
  HUY: t('stockDocument.actionCancel'),
};
const ACTION_ICONS = {
  GUI_DUYET: "📤",
  DUYET: "✅",
  DUYET_CAP_1: "✅",
  DUYET_CAP_2: "✅",
  TU_CHOI: "❌",
  HUY: "🚫",
};
const ACTION_CLASSES = {
  GUI_DUYET: "actor-submit",
  DUYET: "actor-approve",
  DUYET_CAP_1: "actor-approve",
  DUYET_CAP_2: "actor-approve",
  TU_CHOI: "actor-reject",
  HUY: "actor-cancel",
};

function getHistoryActionLabel(action) {
  return ACTION_LABELS[action] || action;
}
function getHistoryActionIcon(action) {
  return ACTION_ICONS[action] || "📌";
}
function getHistoryActionClass(action) {
  return ACTION_CLASSES[action] || "actor-default";
}

function approveButtonLabel() {
  if (actionLoading.value) return t('approvals.actions.approving');
  return t('approvals.actions.approve');
}

const exporting = ref(false);
const exportDropdownOpen = ref(false);

const closeDropdown = (e) => {
  if (!e.target.closest(".export-dropdown-container")) {
    exportDropdownOpen.value = false;
  }
};

window.addEventListener("click", closeDropdown);
onBeforeUnmount(() => {
  window.removeEventListener("click", closeDropdown);
});

async function handleExport(format) {
  if (exporting.value) return;
  actionError.value = "";
  actionMessage.value = "";
  exportDropdownOpen.value = false;

  let printWindow = null;
  if (format === "print") {
    printWindow = window.open("", "_blank");
    if (!printWindow) {
      actionError.value = t('importInspection.messages.printPopupBlocked');
      return;
    }
    printWindow.document.write('<p style="font-family:sans-serif; text-align:center; margin-top:20px;">' + t('importInspection.messages.loadingPrintPdf') + '</p>');
  }

  exporting.value = true;
  try {
    if (format === "pdf") {
      const response = await exportExportReceiptPdf(props.receiptId);
      downloadBlobResponse(response, `phieu-xuat-${receipt.value?.code || props.receiptId}.pdf`);
      actionMessage.value = t('importInspection.messages.exportPdfSuccess');
    } else if (format === "excel") {
      const response = await exportExportReceiptExcel(props.receiptId);
      downloadBlobResponse(response, `phieu-xuat-${receipt.value?.code || props.receiptId}.xlsx`);
      actionMessage.value = t('importInspection.messages.exportExcelSuccess');
    } else if (format === "print") {
      const response = await exportExportReceiptPdf(props.receiptId);
      setPrintWindowBlob(printWindow, response);
    }
  } catch (err) {
    if (printWindow) {
      printWindow.close();
    }
    const actionLabel = format === "pdf" ? t('importInspection.exportLabels.pdf') : format === "excel" ? t('importInspection.exportLabels.excel') : t('importInspection.exportLabels.print');
    actionError.value = err.message || t('importInspection.messages.exportFailed', { label: actionLabel });
  } finally {
    exporting.value = false;
  }
}


watch(
  () => props.receiptId,
  () => {
    actionMessage.value = "";
    actionError.value = "";
    rejectState.value = {
      open: false,
      reason: "",
      error: "",
      submitting: false,
    };
    loadDetail();
  },
  { immediate: true },
);

function translateError(msg) {
  if (!msg) return "";
  const cleaned = String(msg).trim();
  if (cleaned.includes("Nguoi duyet cap 2 phai khac nguoi da duyet cap 1") || cleaned.includes("nguyen tac 4 mat")) {
    return t("approvals.messages.fourEyesError");
  }
  if (cleaned.includes("Nguoi tao phieu khong duoc tu duyet phieu") || cleaned.includes("Nguoi gui duyet khong duoc tu duyet phieu")) {
    return t("approvals.messages.creatorCannotApprove");
  }
  if (cleaned.includes("System error. Please try again later.")) {
    return t("common.systemError");
  }
  return msg;
}
</script>

<template>
  <div v-if="loading" class="card card-pad muted">
    {{ t('stockOutApprovalDetail.messages.loadingDetail') }}
  </div>

  <div v-else-if="error" class="card card-pad error-card">
    <div class="error-title">{{ t('stockOutApprovalDetail.messages.loadFailed') }}</div>
    <div class="error-message">{{ translateError(error) }}</div>
  </div>

  <div v-else-if="!receipt" class="card card-pad">
    <EmptyState
      :title="t('stockOutApprovalDetail.messages.noData')"
      :description="t('stockOutApprovalDetail.messages.noDataDesc')"
    />
  </div>

  <div v-else class="stack">
    <!-- Status Helper Alert -->
    <div class="status-helper-alert card card-pad">
      <div class="row">
        <i class="mdi mdi-information-outline info-icon"></i>
        <div>
          <span class="strong text-sm">{{ t('stockOutApprovalDetail.currentStatus') }}: </span>
          <span class="text-sm text-text">{{ statusHelpers[receipt.status] || t('stockOutApprovalDetail.messages.unknownStatus') }}</span>
        </div>
      </div>
    </div>

    <!-- Thông tin chung -->
    <div class="card card-pad">
      <div class="between">
        <div>
          <h3 class="section-title">{{ t("stockDocumentCreate.section.generalInfo") }}</h3>
          <p class="muted">
            {{ t('stockOutApprovalDetail.checkInfoDesc') }}
          </p>
        </div>
        <div class="row">
          <StatusBadge :status="formatStatus(receipt.status)" />
          
          <div class="export-dropdown-container relative inline-block text-left">
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              :disabled="exporting"
              @click="exportDropdownOpen = !exportDropdownOpen"
            >
              <i class="mdi mdi-export-variant"></i>
              <span>{{ t('importInspection.btn.export') }}</span>
              <i class="mdi mdi-chevron-down"></i>
            </button>
            <div
              v-if="exportDropdownOpen"
              class="absolute right-0 mt-1 w-44 rounded-md shadow-lg bg-white dark:bg-surface ring-1 ring-black ring-opacity-5 z-50 border border-gray-200 dark:border-border"
              style="right: 0;"
            >
              <div class="py-1 flex flex-col items-stretch">
                <button
                  type="button"
                  class="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-slate-800 cursor-pointer"
                  style="border: none; background: none; justify-content: flex-start; box-shadow: none; font-weight: 500; text-align: left; padding: 8px 16px; border-radius: 0;"
                  @click="handleExport('print')"
                >
                  <i class="mdi mdi-printer mr-2 text-slate-500" style="font-size: 16px;"></i>
                  {{ t('importInspection.btn.print') }}
                </button>
                <button
                  type="button"
                  class="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-slate-800 cursor-pointer"
                  style="border: none; background: none; justify-content: flex-start; box-shadow: none; font-weight: 500; text-align: left; padding: 8px 16px; border-radius: 0;"
                  @click="handleExport('pdf')"
                >
                  <i class="mdi mdi-file-pdf-box mr-2 text-slate-500" style="font-size: 16px;"></i>
                  {{ t('importInspection.btn.exportPdf') }}
                </button>
                <button
                  type="button"
                  class="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-slate-800 cursor-pointer"
                  style="border: none; background: none; justify-content: flex-start; box-shadow: none; font-weight: 500; text-align: left; padding: 8px 16px; border-radius: 0;"
                  @click="handleExport('excel')"
                >
                  <i class="mdi mdi-file-excel-box mr-2 text-slate-500" style="font-size: 16px;"></i>
                  {{ t('importInspection.btn.exportExcel') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">{{ t('stockDocument.columns.code') }}</span>
          <span class="detail-value">{{ receipt.code || "-" }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ t('stockDocument.columns.creator') }}</span>
          <span class="detail-value">{{ receipt.createdByName || "-" }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ t('stockDocument.columns.createdAt') }}</span>
          <span class="detail-value">{{ formatDate(receipt.createdAt) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ t('approvals.columns.submitDate') }}</span>
          <span class="detail-value">{{
            formatDate(receipt.submittedAt)
          }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ t('stockDocument.columns.warehouse') }}</span>
          <span class="detail-value">{{ receipt.warehouseName || "-" }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ t('stockDocument.columns.partner') }}</span>
          <span class="detail-value">{{ receipt.partnerName || "-" }}</span>
        </div>

      </div>
    </div>

    <!-- {{ t('importInspection.productListTitle') }} -->
    <div class="card card-pad">
      <div class="between">
        <div>
          <h3 class="section-title">{{ t('importInspection.productListTitle') }}</h3>
          <p class="muted">
            {{ t('stockOutApprovalDetail.productListDesc') }}
          </p>
        </div>
        <span v-if="overstockItems.length" class="warning-pill">
          <i class="mdi mdi-alert-outline"></i>
          {{ t('stockOutApprovalDetail.overstockWarning', { count: overstockItems.length }) }}
        </span>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('stockDocument.columns.code') }}</th>
              <th>{{ t('importInspection.table.product') }}</th>
              <th>{{ t('importInspection.table.unit') || t('exportReceiptDetail.table.unit') }}</th>
              <th style="text-align: right">{{ t('exportReceiptDetail.table.quantity') }}</th>
              <th style="text-align: right">{{ t('stockDocument.table.currentStock') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in receipt.items"
              :key="item.productId || item.productCode"
              :class="{
                'warning-row':
                  Number(item.exportQuantity || 0) >
                  Number(item.currentStock || 0),
              }"
            >
              <td>
                <div class="product-code">{{ item.productCode || "-" }}</div>
              </td>
              <td>
                <div class="product-name">{{ item.productName || "-" }}</div>
              </td>
              <td>{{ item.unitName || "-" }}</td>
              <td style="text-align: right; font-weight: 700;">
                <span>{{ item.exportQuantity ?? "-" }}</span>
              </td>
              <td style="text-align: right; font-weight: 700;" :class="{ 'text-danger': Number(item.exportQuantity || 0) > Number(item.currentStock || 0) }">
                <span>{{ item.currentStock ?? "-" }}</span>
                <span
                  v-if="
                    Number(item.exportQuantity || 0) >
                    Number(item.currentStock || 0)
                  "
                  class="warning-text block text-xxs font-normal text-danger"
                >
                  [{{ t('stockOutApprovalDetail.insufficientStock') }}]
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- {{ t('importInspection.approvalHistory') }} -->
    <div class="card card-pad">
      <h3 class="section-title mb-4">{{ t('importInspection.approvalHistory') }}</h3>
      <div v-if="historyList.length === 0" class="muted italic text-center py-4">
        {{ t('importInspection.emptyHistory') }}
      </div>
      <div v-else class="approval-timeline">
        <div 
          v-for="item in historyList" 
          :key="item.id" 
          class="timeline-row flex items-start gap-4 mb-4 pl-4 relative"
        >
          <div class="timeline-badge-icon flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-gray-200">
            <span>{{ getHistoryActionIcon(item.action) }}</span>
          </div>
          <div class="timeline-body flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-sm text-text">{{ getHistoryActionLabel(item.action) }}</span>
              <span class="text-xs text-muted">{{ formatDate(item.createdAt) }}</span>
            </div>
            <div class="text-sm text-slate-700 mt-1">
              <strong>{{ t('importInspection.actorLabel') }}</strong> {{ item.actorName || t('common.unknown') }}
            </div>
            <div v-if="item.note" class="text-sm text-danger mt-1 italic pl-2 border-l-2 border-red-500 bg-red-50 p-1.5 rounded">
              {{ t('importInspection.reasonLabel') }} {{ item.note }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- {{ t('exportReceiptDetail.table.actions') || t('common.actions') }} -->
    <div class="card card-pad">
      <div class="between">
        <div>
          <h3 class="section-title">{{ t('exportReceiptDetail.table.actions') || t('common.actions') }}</h3>
          <p class="muted">
            {{ t('stockOutApprovalDetail.actionsDesc') }}
          </p>
        </div>
      </div>

      <div v-if="actionMessage" class="action-success">
        {{ actionMessage }}
      </div>
      <div v-if="actionError" class="action-error">
        {{ translateError(actionError) }}
      </div>

      <div
        v-if="receipt?.status === 'TU_CHOI' && receipt?.rejectionReason"
        class="rejection-card"
      >
        <div class="detail-label">{{ t('stockDocument.rejectionReason') }}</div>
        <div class="detail-value text-danger">{{ receipt.rejectionReason }}</div>
      </div>

      <div class="actions-row">
        <button
          v-if="receipt?.status === 'CHO_DUYET'"
          class="btn btn-success"
          type="button"
          :disabled="!canApprove"
          @click="triggerApproveConfirm"
        >
          <i class="mdi mdi-check-circle"></i>
          {{ approveButtonLabel() }}
        </button>
        <button
          v-if="receipt?.status === 'CHO_DUYET'"
          class="btn btn-danger"
          type="button"
          :disabled="!canReject"
          @click="openRejectModal"
        >
          <i class="mdi mdi-close-circle"></i>
          {{ rejectState.submitting ? t('stockDocument.actionSubmitting') : t('approvals.actions.reject') }}
        </button>
        <button
          v-if="receipt?.status === 'DA_DUYET'"
          class="btn btn-success"
          type="button"
          :disabled="!canComplete"
          @click="triggerCompleteConfirm"
        >
          <i class="mdi mdi-check-all"></i>
          {{ actionLoading ? t('common.loading') : t('stockOutApprovalDetail.btn.completeExport') }}
        </button>
      </div>

      <p v-if="receipt?.status === 'CHO_DUYET' && !canManageApproval" class="muted mt-2">
        {{ t('stockOutApprovalDetail.messages.noPermission') }}
      </p>
      <p v-if="receipt?.status === 'DA_DUYET' && !['ADMIN', 'EMPLOYEE'].includes(authStore.currentRole)" class="muted mt-2">
        {{ t('stockOutApprovalDetail.messages.completePermissionOnly') }}
      </p>
    </div>
  </div>

  <ConfirmDialog
    :open="confirmState.open"
    :title="confirmState.title"
    :message="confirmState.message"
    :confirm-text="confirmState.confirmText"
    :loading="actionLoading"
    :danger="confirmState.action === 'reject'"
    @cancel="confirmState.open = false"
    @confirm="executeConfirmedAction"
  />

  <div v-if="rejectState.open" class="modal-backdrop">
    <div class="modal small-modal">
      <div class="modal-head between">
        <h3 class="section-title">{{ t('approvals.actions.rejectReceipt') }}</h3>
        <button
          class="btn btn-icon"
          :aria-label="t('common.close')"
          :disabled="rejectState.submitting"
          @click="closeRejectModal"
        >
          <i class="mdi mdi-close"></i>
        </button>
      </div>
      <div class="modal-body">
        <label class="field-label" for="reject-reason"
          >{{ t('stockDocument.rejectionReason') }} <span class="required">*</span></label
        >
        <textarea
          id="reject-reason"
          v-model="rejectState.reason"
          class="textarea"
          rows="4"
          :maxlength="REJECT_REASON_MAX"
          :placeholder="t('stockOutApprovalDetail.rejectReasonPlaceholder')"
          @input="rejectState.error = ''"
        ></textarea>
        <div class="reason-meta">
          <span v-if="rejectState.error" class="reason-error">{{
            translateError(rejectState.error)
          }}</span>
          <span class="reason-count"
            >{{ rejectState.reason.length }}/{{ REJECT_REASON_MAX }}</span
          >
        </div>
      </div>
      <div class="modal-foot">
        <button
          class="btn"
          type="button"
          :disabled="rejectState.submitting"
          @click="closeRejectModal"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          class="btn btn-danger"
          type="button"
          :disabled="rejectState.submitting"
          @click="confirmReject"
        >
          {{ rejectState.submitting ? t('stockDocument.actionSubmitting') : t('approvals.actions.confirmReject') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-helper-alert {
  border-left: 4px solid var(--color-primary, #2563EB);
  background: var(--color-surface);
}

.info-icon {
  font-size: 20px;
  color: var(--color-primary, #2563EB);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
}

.detail-label {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.detail-value {
  font-weight: 700;
  color: var(--text);
}

.warning-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--color-danger-soft);
  color: var(--danger);
  font-weight: 700;
}

.error-card {
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
}

.error-title {
  color: var(--danger);
  font-weight: 700;
}

.error-message {
  margin-top: 4px;
  color: var(--danger);
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
  margin-top: 16px;
}

.warning-row {
  background: var(--color-danger-soft);
}

.product-code {
  color: var(--muted);
  font-size: 12px;
}

.product-name {
  font-weight: 700;
}

.actions-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.mt-2 {
  margin-top: 8px;
}

@media (max-width: 767px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

.rejection-card {
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
}

.small-modal {
  width: min(460px, 100%);
}

.field-label {
  display: block;
  font-weight: 700;
  margin-bottom: 6px;
}

.required {
  color: var(--danger);
}

.textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
  resize: vertical;
}

.reason-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  gap: 12px;
}

.reason-error {
  color: var(--danger);
  font-size: 13px;
}

.reason-count {
  color: var(--muted);
  font-size: 12px;
  margin-left: auto;
}

.approval-timeline {
  position: relative;
}

.timeline-row::before {
  content: "";
  position: absolute;
  left: 28px;
  top: 32px;
  bottom: -20px;
  width: 2px;
  background: var(--color-border);
}

.timeline-row:last-child::before {
  display: none;
}
</style>
