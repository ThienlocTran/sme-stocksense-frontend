<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import StatusBadge from "../components/StatusBadge.vue";
import ImportReceiptHistoryModal from "../components/ImportReceiptHistoryModal.vue";
import {
  approveImportReceipt,
  getApprovalDetail,
  getPendingApprovals,
  rejectImportReceipt,
  getImportReceipts,
  getDetail,
  approveDiscrepancyReport,
  rejectDiscrepancyReport,
} from "../services/importReceiptService";
import {
  approveExportReceipt,
  getExportReceipt,
  getPendingExportReceipts,
  rejectExportReceipt,
} from "../services/exportReceiptService";
import {
  getInventoryCounts,
  getInventoryCountById,
  finalizeInventoryCount,
  cancelInventoryCount,
} from "../services/inventoryCountService";
import { getWarehouses } from "../services/warehouseService";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const documentType = ref(
  route.query.type === "out" ? "out" :
  route.query.type === "inbound_discrepancy" ? "inbound_discrepancy" :
  route.query.type === "inventory_adjustment" ? "inventory_adjustment" :
  "in"
);

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

const columns = computed(() => {
  if (documentType.value === "inventory_adjustment") {
    return [
      { key: "code", label: "Mã kiểm kê" },
      { key: "warehouseName", label: "Kho hàng" },
      { key: "createdByName", label: "Người tạo" },
      { key: "createdAt", label: "Ngày tạo" },
      { key: "status", label: "Trạng thái" },
      { key: "actions", label: "Thao tác" },
    ];
  }
  const baseColumns = [
    { key: "code", label: t("approvals.columns.code") },
    { key: "warehouseName", label: t("approvals.columns.warehouse") },
    {
      key: "supplierName",
      label: documentType.value === "out" ? t("approvals.columns.customer") : t("approvals.columns.supplier"),
    },
    { key: "createdByName", label: t("approvals.columns.creator") },
    { key: "submittedAt", label: t("approvals.columns.submitDate") },
    { key: "status", label: t("approvals.columns.status") },
    { key: "totalAmount", label: t("approvals.columns.totalAmount") },
    { key: "actions", label: t("approvals.columns.actions") },
  ];
  if (documentType.value === "inbound_discrepancy") {
    return baseColumns.filter(c => c.key !== "totalAmount");
  }
  return baseColumns;
});

const documentTypeOptions = [
  { value: "in", label: t("approvals.documentType.in") },
  { value: "out", label: t("approvals.documentType.out") },
  { value: "inbound_discrepancy", label: t("approvals.documentType.inbound_discrepancy") },
  { value: "inventory_adjustment", label: t("approvals.documentType.inventory_adjustment") },
];

const statusOptions = computed(() => {
  if (documentType.value === "out") {
    return [
      { value: "CHO_DUYET", label: t("approvals.status.pending") },
    ]
  } else if (documentType.value === "in") {
    return [
      { value: "CHO_DUYET_CAP_1", label: t("approvals.status.pendingLevel1") },
      { value: "CHO_DUYET_CAP_2", label: t("approvals.status.pendingLevel2") },
    ]
  } else {
    return [];
  }
})

const statusLabels = {
  CHO_DUYET: t("approvals.status.pending"),
  CHO_DUYET_CAP_1: t("approvals.status.pendingLevel1"),
  CHO_DUYET_CAP_2: t("approvals.status.pendingLevel2"),
  DA_DUYET: t("approvals.status.approved"),
  HOAN_THANH: t("approvals.status.completed"),
};

const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);

const warehouseOptions = ref([]);

onMounted(async () => {
  await Promise.all([loadWarehouseOptions(), fetchPendingApprovals()]);
});

// Sync documentType changes to route query
watch(documentType, (newType) => {
  if (route.query.type !== newType) {
    router.replace({ query: { ...route.query, type: newType } });
  }
});

// Sync route query changes back to documentType
watch(() => route.query.type, (newType) => {
  const targetType =
    newType === "out" ? "out" :
    newType === "inbound_discrepancy" ? "inbound_discrepancy" :
    newType === "inventory_adjustment" ? "inventory_adjustment" :
    "in";
  if (documentType.value !== targetType) {
    documentType.value = targetType;
    clearFilters();
  }
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
    let data;
    if (documentType.value === "out") {
      data = await getPendingExportReceipts({
        page: page.value,
        size: size.value,
        status: filters.status || undefined,
        warehouse: filters.warehouse || undefined,
      });
    } else if (documentType.value === "in") {
      data = await getPendingApprovals({
        page: page.value,
        size: size.value,
        status: filters.status || undefined,
        warehouse: filters.warehouse || undefined,
      });
    } else if (documentType.value === "inbound_discrepancy") {
      const response = await getImportReceipts({
        page: page.value,
        size: size.value,
        status: "CHO_KIEM_HANG",
      });
      const receiptsList = response.content || [];
      const detailsResults = await Promise.allSettled(receiptsList.map(r => getDetail(r.id)));
      const filtered = [];
      receiptsList.forEach((r, idx) => {
        if (detailsResults[idx].status === "fulfilled") {
          const detail = detailsResults[idx].value;
          const hasDiff = (detail.details || []).some(d => d.rowStatus === "CHENH_LECH");
          if (hasDiff) {
            filtered.push({
              ...r,
              details: detail.details,
              note: detail.note,
              version: detail.version,
            });
          }
        }
      });
      data = {
        content: filtered,
        totalPages: response.totalPages || 0,
        totalElements: filtered.length,
      };
    } else if (documentType.value === "inventory_adjustment") {
      const response = await getInventoryCounts({
        page: page.value,
        size: size.value,
        status: "DANG_KIEM_KE",
      });
      data = {
        content: response.content || [],
        totalPages: response.totalPages || 0,
        totalElements: response.totalElements || 0,
      };
    }

    if (token !== requestToken.value) return;

    receipts.value = (data.content || []).map((item) => ({
      ...item,
      supplierName: item.supplierName || item.partnerName || item.customerName || "-",
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

async function openDetail(receipt) {
  const selectedType = receipt.documentType || documentType.value;
  const token = detailState.requestToken + 1;
  detailState.requestToken = token;
  detailState.open = true;
  detailState.loading = true;
  detailState.error = "";
  detailState.receipt = null;
  try {
    let detail;
    if (selectedType === "out") {
      detail = await getExportReceipt(receipt.id);
      detail = {
        ...detail,
        supplierName: detail.partnerName,
        details: detail.items,
        documentType: selectedType,
      };
    } else if (selectedType === "in") {
      detail = await getApprovalDetail(receipt.id);
      detail = { ...detail, documentType: selectedType };
    } else if (selectedType === "inbound_discrepancy") {
      detail = await getDetail(receipt.id);
      detail = { ...detail, documentType: selectedType };
    } else if (selectedType === "inventory_adjustment") {
      detail = await getInventoryCountById(receipt.id);
      detail = { ...detail, documentType: selectedType };
    }
    if (token !== detailState.requestToken) return;
    detailState.receipt = detail;
  } catch (error) {
    if (token !== detailState.requestToken) return;
    detailState.error = error.message || t("approvals.messages.loadDetailError");
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

async function handleApprove(receipt) {
  if (!isPendingApproval(receipt.status)) return;
  approveConfirmState.open = true;
  approveConfirmState.receipt = receipt;
}

function closeApproveConfirm() {
  if (actionState.action === "approve") return;
  approveConfirmState.open = false;
  approveConfirmState.receipt = null;
}

async function confirmApprove() {
  const receipt = approveConfirmState.receipt;
  if (!receipt) return;

  actionState.receiptId = receipt.id;
  actionState.action = "approve";
  actionMessage.value = "";
  actionErrorMessage.value = "";
  try {
    if (receipt.documentType === "out") {
      await approveExportReceipt(receipt.id);
    } else if (receipt.documentType === "in") {
      await approveImportReceipt(receipt.id);
    } else if (receipt.documentType === "inbound_discrepancy") {
      const reportId = getDiscrepancyReportId(receipt.id);
      await approveDiscrepancyReport(receipt.id, reportId);
    } else if (receipt.documentType === "inventory_adjustment") {
      await finalizeInventoryCount(receipt.id, { version: receipt.version });
    }
    approveConfirmState.open = false;
    approveConfirmState.receipt = null;
    closeDetail();
    await fetchPendingApprovals();
    actionMessage.value = t("approvals.messages.approveSuccess", { code: receipt.code });
  } catch (error) {
    actionErrorMessage.value =
      error.message || t("approvals.messages.actionFailed");
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
    rejectState.error = t("approvals.messages.rejectReasonRequired");
    return;
  }
  if (reason.length > REJECT_REASON_MAX) {
    rejectState.error = t("approvals.messages.rejectReasonMaxLength", { max: REJECT_REASON_MAX });
    return;
  }

  rejectState.submitting = true;
  rejectState.error = "";
  actionMessage.value = "";
  actionErrorMessage.value = "";
  try {
    if (currentDocumentType === "out") {
      await rejectExportReceipt(rejectState.receiptId, reason);
    } else if (currentDocumentType === "in") {
      await rejectImportReceipt(rejectState.receiptId, reason);
    } else if (currentDocumentType === "inbound_discrepancy") {
      const reportId = getDiscrepancyReportId(rejectState.receiptId);
      await rejectDiscrepancyReport(rejectState.receiptId, reportId, reason);
    } else if (currentDocumentType === "inventory_adjustment") {
      const row = receipts.value.find((r) => r.id === rejectState.receiptId);
      const version = row ? row.version : 0;
      await cancelInventoryCount(rejectState.receiptId, { reason, version });
    }
    rejectState.open = false;
    rejectState.submitting = false;
    closeDetail();
    await fetchPendingApprovals();
    actionMessage.value = "Đã từ chối/hủy tài liệu thành công.";
  } catch (error) {
    rejectState.submitting = false;
    rejectState.error = error.message || "Không thể từ chối tài liệu.";
    if (error.status === 401) router.replace("/login");
  }
}

function isPendingApproval(status) {
  if (documentType.value === "inventory_adjustment") {
    return status === "DANG_KIEM_KE";
  }
  if (documentType.value === "inbound_discrepancy") {
    return status === "CHO_KIEM_HANG";
  }
  return status === "CHO_DUYET" || status === "CHO_DUYET_CAP_1" || status === "CHO_DUYET_CAP_2";
}

function approveLabel(status) {
  if (documentType.value === "inventory_adjustment") {
    return "Chốt kiểm kê";
  }
  if (documentType.value === "inbound_discrepancy") {
    return "Duyệt chênh lệch";
  }
  return t("approvals.actions.approve");
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
  if (status === "DANG_KIEM_KE") return "Đang kiểm kê";
  if (status === "CHO_KIEM_HANG") return "Chờ kiểm hàng (Lệch)";
  return statusLabels[status] || status || "-";
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
  if (type === "inbound_discrepancy") return "Biên bản chênh lệch";
  if (type === "inventory_adjustment") return "Phiếu kiểm kê";
  return (
    documentTypeOptions.find((option) => option.value === type)?.label ||
    "Phiếu"
  );
}

function documentTypeBadgeClass(type) {
  if (type === "inbound_discrepancy") return "doc-badge-discrepancy";
  if (type === "inventory_adjustment") return "doc-badge-adjustment";
  return type === "out" ? "doc-badge-out" : "doc-badge-in";
}

function getRejectionReason(receipt) {
  return String(receipt?.rejectionReason || receipt?.rejectReason || "").trim();
}

function getDiscrepancyReportId(receiptId) {
  const mapping = JSON.parse(localStorage.getItem("discrepancy_report_ids") || "{}");
  return mapping[receiptId] || receiptId;
}
</script>

<template>
  <PageHeader
    :title="documentType === 'out' ? t('approvals.titleOut') : t('approvals.titleIn')"
    :description="t('approvals.description')"
  />

  <div class="filter-bar card card-pad flex flex-wrap items-center gap-3">
    <div class="flex items-center gap-2">
      <span class="text-xs font-bold text-muted uppercase">{{ t("approvals.filters.type") }}:</span>
      <select
        v-model="documentType"
        class="select max-w-xs"
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
    </div>

    <div class="flex items-center gap-2">
      <span class="text-xs font-bold text-muted uppercase">{{ t("approvals.filters.warehouse") }}:</span>
      <select
        v-model="filters.warehouse"
        class="select max-w-xs"
        @change="applyFilter"
      >
        <option value="">{{ t("approvals.filters.allWarehouses") }}</option>
        <option
          v-for="warehouse in warehouseOptions"
          :key="warehouse"
          :value="warehouse"
        >
          {{ warehouse }}
        </option>
      </select>
    </div>

    <div class="flex items-center gap-2">
      <span class="text-xs font-bold text-muted uppercase">{{ t("approvals.filters.status") }}:</span>
      <select v-model="filters.status" class="select max-w-xs" @change="applyFilter">
        <option value="">{{ t("approvals.filters.all") }}</option>
        <option
          v-for="status in statusOptions"
          :key="status.value"
          :value="status.value"
        >
          {{ status.label }}
        </option>
      </select>
    </div>

    <button
      class="btn btn-ghost btn-sm ml-auto"
      type="button"
      @click="clearFilters"
    >
      {{ t("approvals.actions.clearFilter") }}
    </button>
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
    {{ t("approvals.loading") }}
  </p>


  <div v-if="!isLoading">
    <!-- Desktop Table View -->
    <div class="hidden md:block">
      <DataTable
        :columns="columns"
        :rows="receipts"
        :empty-text="t('approvals.emptyList')"
      >
        <template #code="{ row, value }">
          <div class="document-cell">
            <span class="document-code">{{ value || "-" }}</span>
            <span
              class="badge doc-badge"
              :class="documentTypeBadgeClass(row.documentType)"
            >
              {{ documentTypeLabel(row.documentType) }}
            </span>
          </div>
        </template>
        <template #warehouseName="{ value }">{{ value || "-" }}</template>
        <template #supplierName="{ value }">{{ value || "-" }}</template>
        <template #createdByName="{ value }">{{ value || "-" }}</template>
        <template #submittedAt="{ value }">{{ formatDateTime(value) }}</template>
        <template #status="{ value }">
          <StatusBadge :status="statusLabel(value)" />
        </template>
        <template #totalAmount="{ value }">{{ formatCurrency(value) }}</template>
        <template #actions="{ row }">
          <div class="actions">
            <button
              class="btn btn-sm btn-secondary"
              type="button"
              :disabled="isAnyActionRunning(row)"
              @click="openDetail(row)"
            >
              Xem
            </button>
            <button
              v-if="row.documentType !== 'inventory_adjustment' && row.documentType !== 'inbound_discrepancy'"
              class="btn btn-sm btn-secondary"
              type="button"
              :disabled="isAnyActionRunning(row)"
              @click="openHistory(row)"
            >
              Lịch sử
            </button>
            <button
              class="btn btn-sm btn-success"
              type="button"
              :disabled="
                isAnyActionRunning(row) || !isPendingApproval(row.status)
              "
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
              :disabled="
                isAnyActionRunning(row) || !isPendingApproval(row.status)
              "
              @click="openRejectModal(row)"
            >
              {{ row.documentType === 'inventory_adjustment' ? 'Hủy' : 'Từ chối' }}
            </button>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Mobile Responsive Cards View -->
    <div class="block md:hidden space-y-4">
      <div v-if="receipts.length === 0" class="card card-pad text-center muted py-8">
        {{ t("approvals.emptyList") }}
      </div>
      <div v-else v-for="row in receipts" :key="row.id" class="card card-pad space-y-3">
        <div class="between">
          <div class="document-cell">
            <span class="font-bold text-primary">{{ row.code }}</span>
            <span class="badge doc-badge mt-1" :class="documentTypeBadgeClass(row.documentType)">
              {{ documentTypeLabel(row.documentType) }}
            </span>
          </div>
          <StatusBadge :status="statusLabel(row.status)" />
        </div>
        
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span class="text-muted block text-xs uppercase font-semibold">Kho</span>
            <span class="font-medium text-text">{{ row.warehouseName || '-' }}</span>
          </div>
          <div v-if="row.documentType !== 'inventory_adjustment'">
            <span class="text-muted block text-xs uppercase font-semibold">
              {{ row.documentType === 'out' ? 'Khách hàng' : 'Nhà cung cấp' }}
            </span>
            <span class="font-medium text-text">{{ row.supplierName || '-' }}</span>
          </div>
          <div>
            <span class="text-muted block text-xs uppercase font-semibold">Người tạo</span>
            <span class="font-medium text-text">{{ row.createdByName || '-' }}</span>
          </div>
          <div>
            <span class="text-muted block text-xs uppercase font-semibold">
              {{ row.documentType === 'inventory_adjustment' ? 'Ngày tạo' : 'Ngày gửi' }}
            </span>
            <span class="font-medium text-text">{{ formatDateTime(row.submittedAt || row.createdAt) }}</span>
          </div>
        </div>

        <div class="border-t border-gray-100 pt-3 flex justify-end gap-2 flex-wrap">
          <button class="btn btn-sm btn-secondary" type="button" @click="openDetail(row)">Xem</button>
          <button v-if="row.documentType !== 'inventory_adjustment' && row.documentType !== 'inbound_discrepancy'" class="btn btn-sm btn-secondary" type="button" @click="openHistory(row)">Lịch sử</button>
          <button 
            v-if="isPendingApproval(row.status)" 
            class="btn btn-sm btn-success" 
            type="button" 
            :disabled="isAnyActionRunning(row)" 
            @click="handleApprove(row)"
          >
            {{ approveLabel(row.status) }}
          </button>
          <button 
            v-if="isPendingApproval(row.status)" 
            class="btn btn-sm btn-danger" 
            type="button" 
            :disabled="isAnyActionRunning(row)" 
            @click="openRejectModal(row)"
          >
            {{ row.documentType === 'inventory_adjustment' ? 'Hủy' : 'Từ chối' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="pagination-bar card card-pad">
    <span class="muted">{{ t("approvals.pagination.total", { total: totalElements }) }}</span>
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
        >{{ t("approvals.pagination.pageInfo", { current: totalPages === 0 ? 0 : page + 1, total: totalPages }) }}</span
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
          Chi tiết phiếu
          {{
            (detailState.receipt?.documentType || documentType) === "inventory_adjustment" ? "kiểm kê" :
            (detailState.receipt?.documentType || documentType) === "inbound_discrepancy" ? "chênh lệch" :
            (detailState.receipt?.documentType || documentType) === "out" ? "xuất" : "nhập"
          }}
          chờ duyệt
        </h2>
        <button class="btn btn-icon" aria-label="Đóng" @click="closeDetail">
          <i class="mdi mdi-close"></i>
        </button>
      </div>
      <div class="modal-body">
        <p v-if="detailState.loading" class="muted">
          {{ t("approvals.modal.loadingDetail") }}
        </p>
        <p v-else-if="detailState.error" class="form-alert form-alert-error">
          {{ detailState.error }}
        </p>

        <template v-else-if="detailState.receipt">
          <div
            v-if="getRejectionReason(detailState.receipt)"
            class="detail-rejection-card"
          >
            <p class="detail-rejection-title">{{ t("approvals.modal.rejectionReason") }}</p>
            <p class="detail-rejection-text">
              {{ getRejectionReason(detailState.receipt) }}
            </p>
          </div>

          <!-- Grid for Inventory Count -->
          <div class="detail-grid" v-if="detailState.receipt.documentType === 'inventory_adjustment'">
            <div>
              <span class="detail-label">Mã kiểm kê</span>
              <span class="detail-value">{{ detailState.receipt.code }}</span>
            </div>
            <div>
              <span class="detail-label">Trạng thái</span>
              <StatusBadge :status="statusLabel(detailState.receipt.status)" />
            </div>
            <div>
              <span class="detail-label">Loại phiếu</span>
              <span class="badge doc-badge doc-badge-adjustment">Phiếu kiểm kê</span>
            </div>
            <div>
              <span class="detail-label">Kho hàng</span>
              <span class="detail-value">{{ detailState.receipt.warehouseName || "-" }}</span>
            </div>
            <div>
              <span class="detail-label">Người tạo</span>
              <span class="detail-value">{{ detailState.receipt.createdByName || "-" }}</span>
            </div>
            <div>
              <span class="detail-label">Ngày tạo</span>
              <span class="detail-value">{{ formatDateTime(detailState.receipt.createdAt) }}</span>
            </div>
            <div class="detail-span-2">
              <span class="detail-label">Ghi chú</span>
              <span class="detail-value">{{ detailState.receipt.note || "-" }}</span>
            </div>
          </div>

          <!-- Original Grid for Import/Export/Discrepancy -->
          <div class="detail-grid" v-else>
            <div>
              <span class="detail-label">{{ t("approvals.detail.code") }}</span>
              <span class="detail-value">{{ detailState.receipt.code }}</span>
            </div>
            <div>
              <span class="detail-label">{{ t("approvals.detail.status") }}</span>
              <StatusBadge :status="statusLabel(detailState.receipt.status)" />
            </div>
            <div>
              <span class="detail-label">{{ t("approvals.detail.type") }}</span>
              <span
                class="badge doc-badge"
                :class="documentTypeBadgeClass(detailState.receipt.documentType)"
              >
                {{ documentTypeLabel(detailState.receipt.documentType) }}
              </span>
            </div>
            <div>
              <span class="detail-label">{{ t("approvals.detail.warehouse") }}</span>
              <span class="detail-value">{{ detailState.receipt.warehouseName || "-" }}</span>
            </div>
            <div>
              <span class="detail-label">
                {{ detailState.receipt.documentType === "out" ? "Khách hàng" : "Nhà cung cấp" }}
              </span>
              <span class="detail-value">{{ detailState.receipt.supplierName || "-" }}</span>
            </div>
            <div>
              <span class="detail-label">{{ t("approvals.detail.creator") }}</span>
              <span class="detail-value">{{ detailState.receipt.createdByName || "-" }}</span>
            </div>
            <div>
              <span class="detail-label">{{ t("approvals.detail.submitter") }}</span>
              <span class="detail-value">{{ detailState.receipt.submittedByName || "-" }}</span>
            </div>
            <div>
              <span class="detail-label">{{ t("approvals.detail.submitDate") }}</span>
              <span class="detail-value">{{ formatDateTime(detailState.receipt.submittedAt) }}</span>
            </div>
            <div v-if="detailState.receipt.documentType !== 'inbound_discrepancy'">
              <span class="detail-label">{{ t("approvals.detail.totalAmount") }}</span>
              <span class="detail-value text-primary">{{ formatCurrency(detailState.receipt.totalAmount) }}</span>
            </div>
            <div class="detail-span-2">
              <span class="detail-label">{{ t("approvals.detail.note") }}</span>
              <span class="detail-value">{{ detailState.receipt.note || "-" }}</span>
            </div>
          </div>

          <h3 class="detail-section-title">{{ t("approvals.detail.productList") }}</h3>
          <div class="table-wrap card">
            <table class="data-table">
              <thead>
                <tr v-if="detailState.receipt.documentType === 'inventory_adjustment'">
                  <th>{{ t("approvals.table.productCode") }}</th>
                  <th>{{ t("approvals.table.productName") }}</th>
                  <th style="text-align: right">Tồn sổ sách</th>
                  <th style="text-align: right">Tồn thực tế</th>
                  <th style="text-align: right">Chênh lệch</th>
                  <th>Ghi chú</th>
                </tr>
                <tr v-else-if="detailState.receipt.documentType === 'inbound_discrepancy'">
                  <th>{{ t("approvals.table.productCode") }}</th>
                  <th>{{ t("approvals.table.productName") }}</th>
                  <th style="text-align: right">Dự kiến</th>
                  <th style="text-align: right">Thực nhận</th>
                  <th style="text-align: right">Chênh lệch</th>
                  <th>Ghi chú</th>
                </tr>
                <tr v-else>
                  <th>{{ t("approvals.table.productCode") }}</th>
                  <th>{{ t("approvals.table.productName") }}</th>
                  <th style="text-align: right">Số lượng</th>
                  <th style="text-align: right">Đơn giá</th>
                  <th style="text-align: right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-if="
                    !detailState.receipt.details ||
                    detailState.receipt.details.length === 0
                  "
                >
                  <td colspan="6" class="empty-cell">{{ t("approvals.table.emptyProduct") }}</td>
                </tr>
                <template v-else-if="detailState.receipt.documentType === 'inventory_adjustment'">
                  <tr v-for="item in detailState.receipt.details" :key="item.id">
                    <td>{{ item.productCode || "-" }}</td>
                    <td>{{ item.productName || "-" }}</td>
                    <td style="text-align: right; font-weight: 700;">{{ item.systemQuantity }}</td>
                    <td style="text-align: right; font-weight: 700;">{{ item.actualQuantity }}</td>
                    <td style="text-align: right; font-weight: 700;" :style="{ color: item.differenceQuantity < 0 ? '#b91c1c' : item.differenceQuantity > 0 ? '#166534' : 'inherit' }">
                      {{ item.differenceQuantity > 0 ? '+' : '' }}{{ item.differenceQuantity }}
                    </td>
                    <td>{{ item.note || "-" }}</td>
                  </tr>
                </template>
                <template v-else-if="detailState.receipt.documentType === 'inbound_discrepancy'">
                  <tr v-for="item in detailState.receipt.details" :key="item.id">
                    <td>{{ item.productCode || "-" }}</td>
                    <td>{{ item.productName || "-" }}</td>
                    <td style="text-align: right; font-weight: 700;">{{ item.quantity }}</td>
                    <td style="text-align: right; font-weight: 700;">{{ item.actualReceivedQuantity ?? "-" }}</td>
                    <td style="text-align: right; font-weight: 700;" :style="{ color: (item.actualReceivedQuantity - item.quantity) < 0 ? '#b91c1c' : (item.actualReceivedQuantity - item.quantity) > 0 ? '#166534' : 'inherit' }">
                      <span v-if="item.actualReceivedQuantity !== null">
                        {{ (item.actualReceivedQuantity - item.quantity) > 0 ? '+' : '' }}{{ item.actualReceivedQuantity - item.quantity }}
                      </span>
                      <span v-else>-</span>
                    </td>
                    <td>{{ item.note || "-" }}</td>
                  </tr>
                </template>
                <template v-else>
                  <tr v-for="item in detailState.receipt.details" :key="item.id">
                    <td>{{ item.productCode || "-" }}</td>
                    <td>{{ item.productName || "-" }}</td>
                    <td style="text-align: right; font-weight: 700;">{{ item.quantity }}</td>
                    <td style="text-align: right">{{ formatCurrency(item.unitPrice) }}</td>
                    <td style="text-align: right; font-weight: 700" class="text-primary">{{ formatCurrency(item.lineTotal) }}</td>
                  </tr>
                </template>
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
          class="btn btn-danger mr-2"
          type="button"
          @click="openRejectModal(detailState.receipt)"
        >
          {{ detailState.receipt.documentType === 'inventory_adjustment' ? 'Hủy kiểm kê' : 'Từ chối' }}
        </button>
        <button
          class="btn btn-success"
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
          {{
            rejectState.documentType === 'inventory_adjustment' ? 'Hủy đợt kiểm kê' :
            rejectState.documentType === 'inbound_discrepancy' ? 'Từ chối biên bản chênh lệch' :
            t("approvals.rejectModal.title", { type: rejectState.documentType === "out" ? t("approvals.documentType.outName") : t("approvals.documentType.inName") })
          }}
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
          >Lý do từ chối/hủy <span class="required">*</span></label
        >
        <textarea
          id="reject-reason"
          v-model="rejectState.reason"
          class="textarea"
          rows="4"
          :maxlength="REJECT_REASON_MAX"
          placeholder="Nhập lý do từ chối/hủy để nhân viên lập phiếu nắm được nguyên nhân..."
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
          {{ rejectState.submitting ? "Đang gửi..." : "Xác nhận" }}
        </button>
      </div>
    </div>
  </div>

  <!-- Confirm Dialog Duyệt -->
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
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}
.document-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
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
  font-size: 11px;
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
.doc-badge-discrepancy {
  background: #fef3c7;
  color: #d97706;
}
.doc-badge-adjustment {
  background: #e0f2fe;
  color: #0369a1;
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
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .pagination-bar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
