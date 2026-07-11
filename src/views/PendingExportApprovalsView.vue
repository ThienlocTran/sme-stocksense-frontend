<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import {
  getPendingExportApprovalDetail,
  getPendingExportApprovals,
} from "../services/stockOutApprovalService";

const router = useRouter();

const rows = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const page = ref(0);
const size = ref(10);
const totalPages = ref(0);
const totalElements = ref(0);
const selectedReceipt = ref(null);
const detailLoading = ref(false);
const detailError = ref("");

const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);

const columns = [
  { key: "code", label: "Mã phiếu" },
  { key: "createdByName", label: "Người tạo" },
  { key: "warehouseName", label: "Kho xuất" },
  { key: "submittedAt", label: "Ngày gửi" },
  { key: "status", label: "Trạng thái" },
  { key: "approvalLevelLabel", label: "Cấp duyệt" },
];

onMounted(() => {
  fetchPendingApprovals();
});

async function fetchPendingApprovals() {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const data = await getPendingExportApprovals({
      page: page.value,
      size: size.value,
    });
    rows.value = data.content || [];
    totalPages.value = data.totalPages || 0;
    totalElements.value = data.totalElements || 0;
  } catch (error) {
    rows.value = [];
    errorMessage.value =
      error.message || "Không thể tải danh sách phiếu xuất chờ duyệt.";
  } finally {
    isLoading.value = false;
  }
}

function previousPage() {
  if (isLoading.value || !hasPreviousPage.value) return;
  page.value -= 1;
  fetchPendingApprovals();
}

function nextPage() {
  if (isLoading.value || !hasNextPage.value) return;
  page.value += 1;
  fetchPendingApprovals();
}

async function openDetail(receipt) {
  if (detailLoading.value) return;

  detailLoading.value = true;
  detailError.value = "";
  selectedReceipt.value = null;

  try {
    selectedReceipt.value = await getPendingExportApprovalDetail(receipt.id);
  } catch (error) {
    detailError.value = error.message || "Không thể tải chi tiết phiếu xuất.";
  } finally {
    detailLoading.value = false;
  }
}

function goToDetail(receipt) {
  router.push(`/stock-out/${receipt.id}`);
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

function statusLabel(status) {
  return status === "CHO_DUYET" ? "Chờ duyệt" : status || "-";
}
</script>

<template>
  <PageHeader
    title="Phiếu xuất chờ duyệt"
    description="Danh sách phiếu xuất kho đang chờ quản lý kho xem xét."
  />

  <div class="card card-pad mb-4">
    <div class="between">
      <div>
        <h2 class="section-title">Danh sách phiếu xuất</h2>
        <p class="muted">
          Chỉ hiển thị danh sách và điều hướng sang màn hình chi tiết.
        </p>
      </div>
      <span class="muted">{{ totalElements }} phiếu</span>
    </div>
  </div>

  <div v-if="isLoading" class="card card-pad muted">
    Đang tải danh sách phiếu xuất chờ duyệt...
  </div>
  <div v-else-if="errorMessage" class="card card-pad error-state">
    {{ errorMessage }}
  </div>
  <template v-else>
    <DataTable
      :columns="columns"
      :rows="rows"
      :clickable="true"
      empty-text="Không có phiếu xuất nào đang chờ duyệt. Nhấp vào mã phiếu để mở chi tiết nhanh."
      @row-click="goToDetail"
    >
      <template #code="{ row }">
        <button class="text-link" type="button" @click.stop="openDetail(row)">
          {{ row.code }}
        </button>
      </template>
      <template #createdByName="{ row }">
        {{ row.createdByName || "-" }}
      </template>
      <template #warehouseName="{ row }">
        {{ row.warehouseName || "-" }}
      </template>
      <template #submittedAt="{ row }">
        {{ formatDate(row.submittedAt) }}
      </template>
      <template #status="{ row }">
        <span class="status-chip">{{ statusLabel(row.status) }}</span>
      </template>
      <template #approvalLevelLabel="{ row }">
        {{ row.approvalLevelLabel || "-" }}
      </template>
    </DataTable>

    <div class="pagination-row">
      <span class="muted"
        >Trang {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span
      >
      <div class="actions">
        <button
          class="btn btn-sm"
          type="button"
          :disabled="isLoading || !hasPreviousPage"
          @click="previousPage"
        >
          Trước
        </button>
        <button
          class="btn btn-sm"
          type="button"
          :disabled="isLoading || !hasNextPage"
          @click="nextPage"
        >
          Sau
        </button>
      </div>
    </div>
  </template>

  <div class="card card-pad mt-4">
    <h3 class="section-title">Chi tiết nhanh</h3>
    <div v-if="detailLoading" class="muted">Đang tải chi tiết...</div>
    <div v-else-if="detailError" class="error-state">{{ detailError }}</div>
    <div v-else-if="selectedReceipt" class="detail-grid">
      <div>
        <div class="detail-label">Mã phiếu</div>
        <div class="detail-value">{{ selectedReceipt.code }}</div>
      </div>
      <div>
        <div class="detail-label">Người tạo</div>
        <div class="detail-value">{{ selectedReceipt.createdByName }}</div>
      </div>
      <div>
        <div class="detail-label">Kho xuất</div>
        <div class="detail-value">{{ selectedReceipt.warehouseName }}</div>
      </div>
      <div>
        <div class="detail-label">Cấp duyệt</div>
        <div class="detail-value">{{ selectedReceipt.approvalLevelLabel }}</div>
      </div>
    </div>
    <div v-else class="muted">
      Nhấp vào một dòng để xem thông tin chi tiết nhanh.
    </div>
  </div>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}
.mt-4 {
  margin-top: 16px;
}
.text-link {
  background: none;
  border: 0;
  padding: 0;
  color: var(--primary);
  font-weight: 700;
  cursor: pointer;
}
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}
.pagination-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  gap: 12px;
}
.error-state {
  color: var(--danger);
  font-weight: 600;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.detail-label {
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 4px;
}
.detail-value {
  font-weight: 600;
}
@media (max-width: 1023px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
