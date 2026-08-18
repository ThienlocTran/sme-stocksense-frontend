<script setup>
import { computed, ref, reactive, watch, onBeforeUnmount } from "vue";
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
  confirmText: "Xác nhận",
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
    error.value = err.message || "Không thể tải chi tiết phiếu xuất.";
  } finally {
    if (requestId === loadDetailRequestId) {
      loading.value = false;
    }
  }
}

function triggerApproveConfirm() {
  if (!canApprove.value) return;
  confirmState.title = "Xác nhận duyệt";
  confirmState.message = `Duyệt phiếu xuất kho ${receipt.value?.code || props.receiptId} này?`;
  confirmState.confirmText = "Duyệt phiếu";
  confirmState.action = "approve";
  confirmState.open = true;
}

function triggerCompleteConfirm() {
  if (!canComplete.value) return;
  confirmState.title = "Xác nhận hoàn tất";
  confirmState.message = `Hoàn tất xuất kho cho phiếu ${receipt.value?.code || props.receiptId} này?`;
  confirmState.confirmText = "Hoàn tất";
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
      actionMessage.value = `Đã duyệt phiếu thành công cho phiếu ${approvedReceipt?.code || props.receiptId}.`;
      await loadDetail();
    } else if (confirmState.action === "complete") {
      const completedReceipt = await completeExportReceipt(String(props.receiptId));
      receipt.value = completedReceipt;
      actionMessage.value = `Hoàn tất xuất kho thành công cho phiếu ${completedReceipt?.code || props.receiptId}.`;
      await loadDetail();
    }
  } catch (err) {
    actionError.value = err.message || "Không thể thực hiện hành động.";
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
    rejectState.value.error = "Vui lòng nhập lý do từ chối.";
    return;
  }

  if (reason.length > REJECT_REASON_MAX) {
    rejectState.value.error = `Lý do từ chối không được vượt quá ${REJECT_REASON_MAX} ký tự.`;
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
    actionMessage.value = `Đã từ chối phiếu ${rejectedReceipt?.code || props.receiptId} thành công.`;
    await loadDetail();
  } catch (err) {
    rejectState.value.submitting = false;
    rejectState.value.error = err.message || "Không thể từ chối phiếu xuất.";
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
    CHO_DUYET: "Chờ duyệt",
    DA_DUYET: "Đã duyệt",
    HOAN_THANH: "Hoàn thành",
    TU_CHOI: "Từ chối",
    DA_HUY: "Đã hủy",
  };
  return statusMap[status] || status || "-";
}

const statusHelpers = {
  CHO_DUYET: "Chờ duyệt - phiếu xuất đang chờ quản lý xem duyệt.",
  DA_DUYET: "Đã duyệt - đã được duyệt phê chuẩn, chờ thủ kho xuất hàng thực tế.",
  HOAN_THANH: "Hoàn thành - hàng hóa đã được xuất kho thành công.",
  TU_CHOI: "Từ chối - yêu cầu xuất kho bị từ chối.",
  DA_HUY: "Đã hủy - phiếu xuất kho đã được hủy bỏ.",
};

const ACTION_LABELS = {
  GUI_DUYET: "Gửi duyệt",
  DUYET_CAP_1: "Duyệt cấp 1",
  DUYET_CAP_2: "Duyệt cấp 2",
  TU_CHOI: "Từ chối",
  HUY: "Hủy phiếu",
};
const ACTION_ICONS = {
  GUI_DUYET: "📤",
  DUYET_CAP_1: "✅",
  DUYET_CAP_2: "✅",
  TU_CHOI: "❌",
  HUY: "🚫",
};
const ACTION_CLASSES = {
  GUI_DUYET: "actor-submit",
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
  if (actionLoading.value) return "Đang duyệt...";
  if (receipt.value?.approvalLevelLabel)
    return `Duyệt ${receipt.value.approvalLevelLabel.toLowerCase()}`;
  return "Duyệt";
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
      actionError.value = "Không thể mở bản in. Vui lòng cho phép trình duyệt hiển thị popup.";
      return;
    }
    printWindow.document.write('<p style="font-family:sans-serif; text-align:center; margin-top:20px;">Đang tải bản in PDF...</p>');
  }

  exporting.value = true;
  try {
    if (format === "pdf") {
      const response = await exportExportReceiptPdf(props.receiptId);
      downloadBlobResponse(response, `phieu-xuat-${receipt.value?.code || props.receiptId}.pdf`);
      actionMessage.value = "Xuất phiếu PDF thành công.";
    } else if (format === "excel") {
      const response = await exportExportReceiptExcel(props.receiptId);
      downloadBlobResponse(response, `phieu-xuat-${receipt.value?.code || props.receiptId}.xlsx`);
      actionMessage.value = "Xuất file Excel thành công.";
    } else if (format === "print") {
      const response = await exportExportReceiptPdf(props.receiptId);
      setPrintWindowBlob(printWindow, response);
    }
  } catch (err) {
    if (printWindow) {
      printWindow.close();
    }
    const actionLabel = format === "pdf" ? "xuất phiếu PDF" : format === "excel" ? "xuất file Excel" : "mở bản in";
    actionError.value = err.message || `Không thể ${actionLabel}.`;
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
</script>

<template>
  <div v-if="loading" class="card card-pad muted">
    Đang tải chi tiết phiếu xuất...
  </div>

  <div v-else-if="error" class="card card-pad error-card">
    <div class="error-title">Không thể tải chi tiết phiếu xuất</div>
    <div class="error-message">{{ error }}</div>
  </div>

  <div v-else-if="!receipt" class="card card-pad">
    <EmptyState
      title="Không có dữ liệu phiếu xuất"
      description="Phiếu xuất không tồn tại hoặc chưa được cung cấp cho giao diện này."
    />
  </div>

  <div v-else class="stack">
    <!-- Status Helper Alert -->
    <div class="status-helper-alert card card-pad">
      <div class="row">
        <i class="mdi mdi-information-outline info-icon"></i>
        <div>
          <span class="strong text-sm">Trạng thái hiện tại: </span>
          <span class="text-sm text-text">{{ statusHelpers[receipt.status] || 'Trạng thái không rõ.' }}</span>
        </div>
      </div>
    </div>

    <!-- Thông tin chung -->
    <div class="card card-pad">
      <div class="between">
        <div>
          <h3 class="section-title">Thông tin chung</h3>
          <p class="muted">
            Kiểm tra toàn bộ thông tin trước khi quyết định duyệt hoặc từ chối.
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
              <span>Xuất phiếu</span>
              <i class="mdi mdi-chevron-down"></i>
            </button>
            <div
              v-if="exportDropdownOpen"
              class="absolute right-0 mt-1 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 border border-gray-200"
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
                  In phiếu
                </button>
                <button
                  type="button"
                  class="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-slate-800 cursor-pointer"
                  style="border: none; background: none; justify-content: flex-start; box-shadow: none; font-weight: 500; text-align: left; padding: 8px 16px; border-radius: 0;"
                  @click="handleExport('pdf')"
                >
                  <i class="mdi mdi-file-pdf-box mr-2 text-slate-500" style="font-size: 16px;"></i>
                  Xuất PDF
                </button>
                <button
                  type="button"
                  class="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 text-slate-800 cursor-pointer"
                  style="border: none; background: none; justify-content: flex-start; box-shadow: none; font-weight: 500; text-align: left; padding: 8px 16px; border-radius: 0;"
                  @click="handleExport('excel')"
                >
                  <i class="mdi mdi-file-excel-box mr-2 text-slate-500" style="font-size: 16px;"></i>
                  Xuất Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Mã phiếu</span>
          <span class="detail-value">{{ receipt.code || "-" }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Người tạo</span>
          <span class="detail-value">{{ receipt.createdByName || "-" }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Ngày tạo</span>
          <span class="detail-value">{{ formatDate(receipt.createdAt) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Ngày gửi</span>
          <span class="detail-value">{{
            formatDate(receipt.submittedAt)
          }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Kho xuất</span>
          <span class="detail-value">{{ receipt.warehouseName || "-" }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Cấp duyệt</span>
          <span class="detail-value">{{
            receipt.approvalLevelLabel || "-"
          }}</span>
        </div>
      </div>
    </div>

    <!-- Danh sách sản phẩm -->
    <div class="card card-pad">
      <div class="between">
        <div>
          <h3 class="section-title">Danh sách sản phẩm</h3>
          <p class="muted">
            Hiển thị số lượng xuất và tồn hiện tại của từng sản phẩm.
          </p>
        </div>
        <span v-if="overstockItems.length" class="warning-pill">
          <i class="mdi mdi-alert-outline"></i>
          Có {{ overstockItems.length }} mặt hàng vượt tồn kho
        </span>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Mã sản phẩm</th>
              <th>Tên sản phẩm</th>
              <th>Đơn vị</th>
              <th style="text-align: right">Số lượng xuất</th>
              <th style="text-align: right">Tồn hiện tại</th>
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
                  [Không đủ tồn kho]
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Lịch sử phê duyệt -->
    <div class="card card-pad">
      <h3 class="section-title mb-4">Lịch sử phê duyệt</h3>
      <div v-if="historyList.length === 0" class="muted italic text-center py-4">
        Chưa có lịch sử phê duyệt cho phiếu này.
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
              <strong>Người thực hiện:</strong> {{ item.actorName || 'Không rõ' }}
            </div>
            <div v-if="item.note" class="text-sm text-danger mt-1 italic pl-2 border-l-2 border-red-500 bg-red-50 p-1.5 rounded">
              Lý do: {{ item.note }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hành động -->
    <div class="card card-pad">
      <div class="between">
        <div>
          <h3 class="section-title">Hành động</h3>
          <p class="muted">
            Duyệt hoặc từ chối phiếu xuất này dựa trên vai trò của bạn.
          </p>
        </div>
      </div>

      <div v-if="actionMessage" class="action-success">
        {{ actionMessage }}
      </div>
      <div v-if="actionError" class="action-error">
        {{ actionError }}
      </div>

      <div
        v-if="receipt?.status === 'TU_CHOI' && receipt?.rejectionReason"
        class="rejection-card"
      >
        <div class="detail-label">Lý do từ chối</div>
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
          {{ rejectState.submitting ? "Đang gửi..." : "Từ chối" }}
        </button>
        <button
          v-if="receipt?.status === 'DA_DUYET'"
          class="btn btn-success"
          type="button"
          :disabled="!canComplete"
          @click="triggerCompleteConfirm"
        >
          <i class="mdi mdi-check-all"></i>
          {{ actionLoading ? "Đang hoàn tất..." : "Hoàn tất xuất kho" }}
        </button>
      </div>

      <p v-if="receipt?.status === 'CHO_DUYET' && !canManageApproval" class="muted mt-2">
        Bạn hiện không có quyền thực hiện duyệt hoặc từ chối.
      </p>
      <p v-if="receipt?.status === 'DA_DUYET' && !['ADMIN', 'EMPLOYEE'].includes(authStore.currentRole)" class="muted mt-2">
        Chỉ Admin hoặc Nhân viên kho được hoàn tất xuất kho.
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
        <h3 class="section-title">Từ chối phiếu xuất</h3>
        <button
          class="btn btn-icon"
          aria-label="Đóng"
          :disabled="rejectState.submitting"
          @click="closeRejectModal"
        >
          <i class="mdi mdi-close"></i>
        </button>
      </div>
      <div class="modal-body">
        <label class="field-label" for="reject-reason"
          >Lý do từ chối <span class="required">*</span></label
        >
        <textarea
          id="reject-reason"
          v-model="rejectState.reason"
          class="textarea"
          rows="4"
          :maxlength="REJECT_REASON_MAX"
          placeholder="Nhập lý do từ chối để nhân viên biết nguyên nhân..."
          @input="rejectState.error = ''"
        ></textarea>
        <div class="reason-meta">
          <span v-if="rejectState.error" class="reason-error">{{
            rejectState.error
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
          Hủy
        </button>
        <button
          class="btn btn-danger"
          type="button"
          :disabled="rejectState.submitting"
          @click="confirmReject"
        >
          {{ rejectState.submitting ? "Đang gửi..." : "Xác nhận từ chối" }}
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
  background: #fef2f2;
  color: var(--danger);
  font-weight: 700;
}

.error-card {
  border-color: #fecaca;
  background: #fff5f5;
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
  background: #fef2f2;
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
