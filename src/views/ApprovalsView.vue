<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import ImportReceiptHistoryModal from "../components/ImportReceiptHistoryModal.vue";
import {
  approveImportReceipt,
  getApprovalDetail,
  getPendingApprovals,
  rejectImportReceipt,
} from "../services/importReceiptService";
import {
  approveExportReceipt,
  getExportReceipt,
  getPendingExportReceipts,
  rejectExportReceipt,
} from "../services/exportReceiptService";
import { getWarehouses } from "../services/warehouseService";

const router = useRouter();
const documentType = ref("in");

const receipts = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const actionMessage = ref("");
const actionErrorMessage = ref("");

const page = ref(0);
const size = ref(10);
const totalPages = ref(0);
const totalElements = ref(0);
const filters = reactive({ status: "", warehouse: "" });
const requestToken = ref(0);

// Trạng thái thao tác đang chạy theo từng phiếu
const actionState = reactive({ receiptId: null, action: "" });
const approveConfirmState = reactive({ open: false, receipt: null });

// Chi tiết phiếu (T96)
const detailState = reactive({
  open: false,
  loading: false,
  error: "",
  receipt: null,
  requestToken: 0,
});

// Modal từ chối (T98)
const rejectState = reactive({
  open: false,
  receiptId: null,
  documentType: "in",
  reason: "",
  error: "",
  submitting: false,
});

// Modal Lịch sử duyệt
const historyState = reactive({
  open: false,
  receiptId: null,
  receiptCode: "",
});

const REJECT_REASON_MAX = 500;

const columns = computed(() => [
  { key: "code", label: "Mã phiếu" },
  { key: "warehouseName", label: "Kho" },
  {
    key: "supplierName",
    label: documentType.value === "out" ? "Khách hàng" : "Nhà cung cấp",
  },
  { key: "createdByName", label: "Người tạo" },
  { key: "submittedAt", label: "Ngày gửi duyệt" },
  { key: "status", label: "Trạng thái" },
  { key: "totalAmount", label: "Tổng tiền" },
  { key: "actions", label: "Thao tác" },
]);

const documentTypeOptions = [
  { value: "in", label: "Phiếu nhập" },
  { value: "out", label: "Phiếu xuất" },
];

const statusOptions = [
  { value: "CHO_DUYET_CAP_1", label: "Chờ cấp 1" },
  { value: "CHO_DUYET_CAP_2", label: "Chờ cấp 2" },
];

const statusLabels = {
  CHO_DUYET_CAP_1: "Chờ cấp 1",
  CHO_DUYET_CAP_2: "Chờ cấp 2",
};

const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);

const warehouseOptions = ref([]);

onMounted(async () => {
  await Promise.all([loadWarehouseOptions(), fetchPendingApprovals()]);
});

async function loadWarehouseOptions() {
  try {
    const data = await getWarehouses({ status: "HOAT_DONG" });
    const list = Array.isArray(data) ? data : data?.content || [];
    warehouseOptions.value = list
      .map((item) => item?.name || item?.warehouseName || item?.tenKho || "")
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "vi"));
  } catch (error) {
    warehouseOptions.value = [];
  }
}

async function fetchPendingApprovals() {
  const token = ++requestToken.value;
  isLoading.value = true;
  errorMessage.value = "";
  actionMessage.value = "";
  actionErrorMessage.value = "";
  try {
    const data = await (
      documentType.value === "out"
        ? getPendingExportReceipts
        : getPendingApprovals
    )({
      page: page.value,
      size: size.value,
      status: filters.status,
      warehouse: filters.warehouse || undefined,
    });
    if (token !== requestToken.value) return;
    receipts.value = (data.content || []).map((item) => ({
      ...item,
      supplierName: item.supplierName || item.partnerName,
      documentType: documentType.value,
    }));
    totalPages.value = data.totalPages || 0;
    totalElements.value = data.totalElements || 0;
  } catch (error) {
    if (token !== requestToken.value) return;
    receipts.value = [];
    errorMessage.value = error.message;
    if (error.status === 401) router.replace("/login");
  } finally {
    if (token === requestToken.value) {
      isLoading.value = false;
    }
  }
}

function applyFilter() {
  page.value = 0;
  fetchPendingApprovals();
}

function clearFilters() {
  filters.status = "";
  filters.warehouse = "";
  page.value = 0;
  fetchPendingApprovals();
}

function previousPage() {
  if (!hasPreviousPage.value) return;
  page.value -= 1;
  fetchPendingApprovals();
}

function nextPage() {
  if (!hasNextPage.value) return;
  page.value += 1;
  fetchPendingApprovals();
}

// ===== T96: Xem chi tiết phiếu chờ duyệt =====
async function openDetail(receipt) {
  const selectedType = receipt.documentType || documentType.value;
  const token = detailState.requestToken + 1;
  detailState.requestToken = token;
  detailState.open = true;
  detailState.loading = true;
  detailState.error = "";
  detailState.receipt = null;
  try {
    const detail = await (
      selectedType === "out" ? getExportReceipt : getApprovalDetail
    )(receipt.id);
    if (token !== detailState.requestToken) return;
    detailState.receipt =
      selectedType === "out"
        ? {
            ...detail,
            supplierName: detail.partnerName,
            details: detail.items,
            documentType: selectedType,
          }
        : { ...detail, documentType: selectedType };
  } catch (error) {
    if (token !== detailState.requestToken) return;
    detailState.error = error.message || "Không thể tải chi tiết phiếu.";
    if (error.status === 401) router.replace("/login");
  } finally {
    if (token === detailState.requestToken) {
      detailState.loading = false;
    }
  }
}

function closeDetail() {
  detailState.requestToken += 1;
  detailState.open = false;
  detailState.receipt = null;
  detailState.error = "";
}

// ===== T97: Duyệt phiếu nhập =====
async function handleApprove(receipt) {
  if (!isPendingApproval(receipt.status)) return;
  approveConfirmState.open = true;
  approveConfirmState.receipt = receipt;
}

// ===== T98: Từ chối phiếu nhập (modal + validate lý do) =====
function closeApproveConfirm() {
  if (actionState.action === "approve") return;
  approveConfirmState.open = false;
  approveConfirmState.receipt = null;
}

async function confirmApprove() {
  const receipt = approveConfirmState.receipt;
  if (!receipt || !isPendingApproval(receipt.status)) return;

  const isOut = receipt.documentType === "out";
  actionState.receiptId = receipt.id;
  actionState.action = "approve";
  actionMessage.value = "";
  actionErrorMessage.value = "";
  try {
    await (isOut ? approveExportReceipt : approveImportReceipt)(receipt.id);
    approveConfirmState.open = false;
    approveConfirmState.receipt = null;
    closeDetail();
    await fetchPendingApprovals();
    actionMessage.value = `Đã duyệt phiếu ${receipt.code} thành công.`;
  } catch (error) {
    actionErrorMessage.value =
      error.message || "Thao tác thất bại, vui lòng thử lại.";
    if (error.status === 401) router.replace("/login");
  } finally {
    actionState.receiptId = null;
    actionState.action = "";
  }
}

function openRejectModal(receipt) {
  if (!isPendingApproval(receipt?.status)) return;
  rejectState.open = true;
  rejectState.receiptId = receipt.id;
  rejectState.documentType = receipt.documentType || documentType.value;
  rejectState.reason = "";
  rejectState.error = "";
  rejectState.submitting = false;
}

function closeRejectModal() {
  if (rejectState.submitting) return;
  rejectState.open = false;
  rejectState.receiptId = null;
  rejectState.documentType = "in";
  rejectState.reason = "";
  rejectState.error = "";
}

async function confirmReject() {
  const reason = rejectState.reason.trim();
  const currentDocumentType = rejectState.documentType || documentType.value;
  if (!reason) {
    rejectState.error = "Vui lòng nhập lý do từ chối.";
    return;
  }
  if (reason.length > REJECT_REASON_MAX) {
    rejectState.error = `Lý do từ chối không được vượt quá ${REJECT_REASON_MAX} ký tự.`;
    return;
  }

  rejectState.submitting = true;
  rejectState.error = "";
  actionMessage.value = "";
  actionErrorMessage.value = "";
  try {
    await (
      currentDocumentType === "out" ? rejectExportReceipt : rejectImportReceipt
    )(rejectState.receiptId, reason);
    rejectState.open = false;
    rejectState.submitting = false;
    closeDetail();
    await fetchPendingApprovals();
    actionMessage.value = `Đã từ chối phiếu ${currentDocumentType === "out" ? "xuất" : "nhập"} thành công.`;
  } catch (error) {
    rejectState.submitting = false;
    rejectState.error =
      error.message ||
      (currentDocumentType === "out"
        ? "Không thể từ chối phiếu xuất."
        : "Không thể từ chối phiếu nhập.");
    if (error.status === 401) router.replace("/login");
  }
}

function isPendingApproval(status) {
  return status === "CHO_DUYET_CAP_1" || status === "CHO_DUYET_CAP_2";
}

function approveLabel(status) {
  if (isPendingApproval(status)) return "Duyệt phiếu";
  return "Duyệt phiếu";
}

function isActionRunning(receipt, action) {
  return actionState.receiptId === receipt.id && actionState.action === action;
}

function isAnyActionRunning(receipt) {
  return actionState.receiptId === receipt.id;
}

function openHistory(receipt) {
  historyState.receiptId = receipt.id;
  historyState.receiptCode = receipt.code;
  historyState.open = true;
}

function closeHistory() {
  historyState.open = false;
  historyState.receiptId = null;
  historyState.receiptCode = "";
}

function statusLabel(status) {
  return statusLabels[status] || status || "-";
}

function statusClass(status) {
  return `status-${String(status || "unknown")
    .toLowerCase()
    .replaceAll("_", "-")}`;
}

function formatDateTime(value) {
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

function formatCurrency(value) {
  if (value === null || value === undefined) return "-";
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

function documentTypeLabel(type) {
  return (
    documentTypeOptions.find((option) => option.value === type)?.label ||
    "Phiếu"
  );
}

function documentTypeBadgeClass(type) {
  return type === "out" ? "doc-badge-out" : "doc-badge-in";
}

function getRejectionReason(receipt) {
  return String(receipt?.rejectionReason || receipt?.rejectReason || "").trim();
}
</script>

<template>
  <PageHeader
    :title="`Phiếu ${documentType === 'out' ? 'xuất' : 'nhập'} chờ duyệt`"
    description="Quản lý duyệt hoặc từ chối phiếu kho theo cấp."
  />

  <div class="filter-bar">
    <div class="filter-card card card-pad">
      <div class="filter-header">
        <div>
          <h3 class="section-title">Bộ lọc duyệt</h3>
          <p class="filter-subtitle">
            Tập trung thao tác duyệt cho Manager/Admin.
          </p>
        </div>
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          @click="clearFilters"
        >
          Xóa lọc
        </button>
      </div>
      <div class="filter-controls">
        <label class="filter-field">
          <span class="filter-label">Loại phiếu</span>
          <select
            v-model="documentType"
            class="select"
            @change="
              filters.warehouse = '';
              page = 0;
              fetchPendingApprovals();
            "
          >
            <option
              v-for="option in documentTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="filter-field">
          <span class="filter-label">Kho</span>
          <select
            v-model="filters.warehouse"
            class="select"
            @change="applyFilter"
          >
            <option value="">Tất cả kho</option>
            <option
              v-for="warehouse in warehouseOptions"
              :key="warehouse"
              :value="warehouse"
            >
              {{ warehouse }}
            </option>
          </select>
        </label>

        <label class="filter-field">
          <span class="filter-label">Trạng thái</span>
          <select v-model="filters.status" class="select" @change="applyFilter">
            <option value="">Tất cả trạng thái</option>
            <option
              v-for="status in statusOptions"
              :key="status.value"
              :value="status.value"
            >
              {{ status.label }}
            </option>
          </select>
        </label>
      </div>
    </div>
  </div>

  <p v-if="errorMessage" class="form-alert form-alert-error">
    {{ errorMessage }}
  </p>
  <p v-if="actionErrorMessage" class="form-alert form-alert-error">
    {{ actionErrorMessage }}
  </p>
  <p v-if="actionMessage" class="form-alert form-alert-info">
    {{ actionMessage }}
  </p>
  <p v-if="isLoading" class="muted loading-line">
    Đang tải danh sách phiếu chờ duyệt...
  </p>

  <DataTable
    :columns="columns"
    :rows="receipts"
    empty-text="Không có phiếu nào đang chờ duyệt"
  >
    <template #code="{ row, value }">
      <div class="document-cell">
        <span class="document-code">{{ value || "-" }}</span>
        <span
          class="badge doc-badge"
          :class="documentTypeBadgeClass(documentType)"
          >{{ documentTypeLabel(documentType) }}</span
        >
      </div>
    </template>
    <template #warehouseName="{ value }">{{ value || "-" }}</template>
    <template #supplierName="{ value }">{{ value || "-" }}</template>
    <template #createdByName="{ value }">{{ value || "-" }}</template>
    <template #submittedAt="{ value }">{{ formatDateTime(value) }}</template>
    <template #status="{ value }">
      <span class="badge" :class="statusClass(value)">{{
        statusLabel(value)
      }}</span>
    </template>
    <template #totalAmount="{ value }">{{ formatCurrency(value) }}</template>
    <template #actions="{ row }">
      <div class="actions">
        <button
          class="btn btn-sm"
          type="button"
          :disabled="isAnyActionRunning(row)"
          @click="openDetail(row)"
        >
          Xem
        </button>
        <button
          class="btn btn-sm btn-secondary"
          type="button"
          :disabled="isAnyActionRunning(row)"
          @click="openHistory(row)"
        >
          Lịch sử
        </button>
        <button
          class="btn btn-sm btn-primary"
          type="button"
          :disabled="isAnyActionRunning(row) || !isPendingApproval(row.status)"
          @click="handleApprove(row)"
        >
          {{
            isActionRunning(row, "approve")
              ? "Đang duyệt..."
              : approveLabel(row.status)
          }}
        </button>
        <button
          class="btn btn-sm btn-danger"
          type="button"
          :disabled="isAnyActionRunning(row) || !isPendingApproval(row.status)"
          @click="openRejectModal(row)"
        >
          Từ chối
        </button>
      </div>
    </template>
  </DataTable>

  <div class="pagination-bar card card-pad">
    <span class="muted">{{ totalElements }} phiếu chờ duyệt</span>
    <div class="pagination-actions">
      <button
        class="btn btn-sm"
        type="button"
        :disabled="!hasPreviousPage"
        @click="previousPage"
      >
        Trước
      </button>
      <span class="page-indicator"
        >Trang {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span
      >
      <button
        class="btn btn-sm"
        type="button"
        :disabled="!hasNextPage"
        @click="nextPage"
      >
        Sau
      </button>
    </div>
  </div>

  <!-- T96: Modal chi tiết phiếu cho quản lý -->
  <div v-if="detailState.open" class="modal-backdrop">
    <div class="modal detail-modal">
      <div class="modal-head between">
        <h2 class="section-title">
          Chi tiết phiếu {{ documentType === "out" ? "xuất" : "nhập" }} chờ
          duyệt
        </h2>
        <button class="btn btn-icon" aria-label="Đóng" @click="closeDetail">
          <i class="mdi mdi-close"></i>
        </button>
      </div>
      <div class="modal-body">
        <p v-if="detailState.loading" class="muted">
          Đang tải chi tiết phiếu...
        </p>
        <p v-else-if="detailState.error" class="form-alert form-alert-error">
          {{ detailState.error }}
        </p>

        <template v-else-if="detailState.receipt">
          <div
            v-if="getRejectionReason(detailState.receipt)"
            class="detail-rejection-card"
          >
            <p class="detail-rejection-title">Lý do từ chối</p>
            <p class="detail-rejection-text">
              {{ getRejectionReason(detailState.receipt) }}
            </p>
          </div>

          <div class="detail-grid">
            <div>
              <span class="detail-label">Mã phiếu</span
              ><span class="detail-value">{{ detailState.receipt.code }}</span>
            </div>
            <div>
              <span class="detail-label">Trạng thái</span>
              <span
                class="badge"
                :class="statusClass(detailState.receipt.status)"
                >{{ statusLabel(detailState.receipt.status) }}</span
              >
            </div>
            <div>
              <span class="detail-label">Loại phiếu</span
              ><span
                class="badge doc-badge"
                :class="documentTypeBadgeClass(documentType)"
                >{{ documentTypeLabel(documentType) }}</span
              >
            </div>
            <div>
              <span class="detail-label">Kho</span
              ><span class="detail-value">{{
                detailState.receipt.warehouseName || "-"
              }}</span>
            </div>
            <div>
              <span class="detail-label">Nhà cung cấp</span
              ><span class="detail-value">{{
                detailState.receipt.supplierName || "-"
              }}</span>
            </div>
            <div>
              <span class="detail-label">Người tạo</span
              ><span class="detail-value">{{
                detailState.receipt.createdByName || "-"
              }}</span>
            </div>
            <div>
              <span class="detail-label">Người gửi duyệt</span
              ><span class="detail-value">{{
                detailState.receipt.submittedByName || "-"
              }}</span>
            </div>
            <div>
              <span class="detail-label">Ngày gửi duyệt</span
              ><span class="detail-value">{{
                formatDateTime(detailState.receipt.submittedAt)
              }}</span>
            </div>
            <div>
              <span class="detail-label">Tổng tiền</span
              ><span class="detail-value">{{
                formatCurrency(detailState.receipt.totalAmount)
              }}</span>
            </div>
            <div class="detail-span-2">
              <span class="detail-label">Ghi chú</span
              ><span class="detail-value">{{
                detailState.receipt.note || "-"
              }}</span>
            </div>
          </div>

          <h3 class="detail-section-title">Danh sách sản phẩm</h3>
          <div class="table-wrap card">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mã SP</th>
                  <th>Tên sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-if="
                    !detailState.receipt.details ||
                    detailState.receipt.details.length === 0
                  "
                >
                  <td colspan="5" class="empty-cell">Phiếu chưa có sản phẩm</td>
                </tr>
                <tr v-for="item in detailState.receipt.details" :key="item.id">
                  <td>{{ item.productCode || "-" }}</td>
                  <td>{{ item.productName || "-" }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ formatCurrency(item.unitPrice) }}</td>
                  <td>{{ formatCurrency(item.lineTotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
      <div
        v-if="
          detailState.receipt && isPendingApproval(detailState.receipt.status)
        "
        class="modal-foot"
      >
        <button
          class="btn btn-danger"
          type="button"
          @click="openRejectModal(detailState.receipt)"
        >
          Từ chối phiếu
        </button>
        <button
          class="btn btn-primary"
          type="button"
          @click="handleApprove(detailState.receipt)"
        >
          {{ approveLabel(detailState.receipt.status) }}
        </button>
      </div>
    </div>
  </div>

  <!-- T98: Modal từ chối phiếu nhập -->
  <div v-if="rejectState.open" class="modal-backdrop">
    <div class="modal small-modal">
      <div class="modal-head between">
        <h2 class="section-title">
          Từ chối phiếu {{ documentType === "out" ? "xuất" : "nhập" }}
        </h2>
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
          placeholder="Nhập lý do từ chối để nhân viên lập phiếu nắm được nguyên nhân..."
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

  <!-- Modal Lịch sử duyệt -->
  <ConfirmDialog
    :open="approveConfirmState.open"
    title="Xác nhận duyệt"
    :message="
      approveConfirmState.receipt
        ? `${approveLabel(approveConfirmState.receipt.status)} phiếu ${approveConfirmState.receipt.code}?`
        : ''
    "
    :confirm-text="
      approveConfirmState.receipt
        ? approveLabel(approveConfirmState.receipt.status)
        : 'Xác nhận'
    "
    @cancel="closeApproveConfirm"
    @confirm="confirmApprove"
  />

  <ImportReceiptHistoryModal
    v-if="historyState.open"
    :receipt-id="historyState.receiptId"
    :receipt-code="historyState.receiptCode"
    :document-type="documentType"
    @close="closeHistory"
  />
</template>

<style scoped>
.loading-line {
  margin: 8px 0 14px;
}
.form-alert {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 8px;
  line-height: 20px;
}
.form-alert-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.form-alert-info {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-bar {
  margin-bottom: 16px;
}
.filter-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.filter-subtitle {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 13px;
}
.filter-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.filter-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.document-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.document-code {
  font-weight: 700;
  color: #0f172a;
}
.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  background: #f1f5f9;
  color: #475569;
}
.doc-badge {
  background: #e0f2fe;
  color: #0369a1;
}
.doc-badge-out {
  background: #ede9fe;
  color: #6d28d9;
}
.doc-badge-in {
  background: #dcfce7;
  color: #166534;
}
.status-cho-duyet-cap-1,
.status-cho-duyet-cap-2,
.status-cho-hang-ve,
.status-cho-kiem-hang {
  background: #fef3c7;
  color: #b45309;
}
.status-tu-choi {
  background: #fee2e2;
  color: #b91c1c;
}
.status-hoan-thanh {
  background: #dcfce7;
  color: #15803d;
}
.status-nhap,
.status-huy {
  background: #f1f5f9;
  color: #475569;
}
.pagination-bar {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pagination-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.page-indicator {
  color: var(--muted);
  font-weight: 600;
}

.detail-modal {
  width: min(760px, 100%);
}
.detail-focus-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #bfdbfe;
  background: linear-gradient(90deg, #eff6ff 0%, #f8fbff 100%);
  border-radius: 12px;
  margin-bottom: 14px;
}
.detail-focus-title {
  margin: 0 0 4px;
  font-weight: 800;
  color: #1d4ed8;
}
.detail-focus-text {
  margin: 0;
  font-size: 13px;
  color: #334155;
}
.detail-focus-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.detail-rejection-card {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  margin-bottom: 14px;
}
.detail-rejection-title {
  margin: 0 0 4px;
  font-weight: 800;
}
.detail-rejection-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 18px;
  margin-bottom: 18px;
}
.detail-grid > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.detail-span-2 {
  grid-column: 1 / -1;
}
.detail-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}
.detail-value {
  font-size: 14px;
  font-weight: 600;
}
.detail-section-title {
  margin: 8px 0 10px;
  font-size: 14px;
  font-weight: 800;
}
.empty-cell {
  text-align: center;
  color: var(--muted);
  padding: 24px;
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
  color: #b91c1c;
}
.textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
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
  color: #b91c1c;
  font-size: 13px;
}
.reason-count {
  color: var(--muted);
  font-size: 12px;
  margin-left: auto;
}

@media (max-width: 640px) {
  .filter-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .filter-controls {
    grid-template-columns: 1fr;
  }
  .detail-focus-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .detail-focus-actions {
    width: 100%;
  }
  .detail-focus-actions .btn {
    flex: 1 1 100%;
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .pagination-bar {
    align-items: flex-start;
    flex-direction: column;
  }
  .actions {
    flex-direction: column;
    align-items: stretch;
  }
  .actions .btn {
    width: 100%;
  }
}
</style>
