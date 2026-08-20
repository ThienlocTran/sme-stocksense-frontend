<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import DataTable from "../components/DataTable.vue";
import StatusBadge from "../components/StatusBadge.vue";
import {
  getPendingExportApprovalDetail,
  getPendingExportApprovals,
} from "../services/stockOutApprovalService";

const router = useRouter();
const { t } = useI18n();

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

const columns = computed(() => [
  { key: "code", label: t('approvals.columns.code') },
  { key: "createdByName", label: t('approvals.columns.creator') },
  { key: "warehouseName", label: t('approvals.columns.warehouse') },
  { key: "submittedAt", label: t('approvals.columns.submitDate') },
  { key: "status", label: t('approvals.columns.status') },
  { key: "approvalLevelLabel", label: t('approvals.columns.approvalLevel') },
]);

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
      error.message || t('approvals.messages.loadDetailError');
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
    detailError.value = error.message || t('approvals.messages.loadDetailError');
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
  return status === "CHO_DUYET" ? t('approvals.status.pending') : status || "-";
}
</script>

<template>
  <PageHeader
    :title="t('approvals.titleOut')"
    :description="t('approvals.pendingExportDesc')"
  />

  <div class="card card-pad mb-4">
    <div class="between">
      <div>
        <h2 class="section-title">{{ t('approvals.listTitle') }}</h2>
        <p class="muted">
          {{ t('approvals.listDesc') }}
        </p>
      </div>
      <span class="muted font-bold">{{ t('approvals.documentCount', { count: totalElements }) }}</span>
    </div>
  </div>

  <div v-if="isLoading" class="card card-pad muted">
    {{ t('approvals.loadingPendingExport') }}
  </div>
  <div v-else-if="errorMessage" class="card card-pad error-state">
    {{ errorMessage }}
  </div>
  <template v-else>
    <!-- Desktop Table View -->
    <div class="hidden md:block">
      <DataTable
        :columns="columns"
        :rows="rows"
        :clickable="true"
        :empty-text="t('approvals.emptyPendingExport')"
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
          <StatusBadge :status="statusLabel(row.status)" />
        </template>
        <template #approvalLevelLabel="{ row }">
          {{ row.approvalLevelLabel || "-" }}
        </template>
      </DataTable>
    </div>

    <!-- Mobile Responsive Cards View -->
    <div class="block md:hidden space-y-4">
      <div v-if="rows.length === 0" class="card card-pad text-center muted py-8">
        {{ t('approvals.emptyPendingExport') }}
      </div>
      <div v-else v-for="row in rows" :key="row.id" class="card card-pad space-y-3" @click="goToDetail(row)">
        <div class="between">
          <button class="text-link font-bold text-base text-primary" type="button" @click.stop="goToDetail(row)">
            {{ row.code }}
          </button>
          <StatusBadge :status="statusLabel(row.status)" />
        </div>
        
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span class="text-muted block text-xs uppercase font-semibold">{{ t('approvals.columns.warehouse') }}</span>
            <span class="font-medium text-text">{{ row.warehouseName || '-' }}</span>
          </div>
          <div>
            <span class="text-muted block text-xs uppercase font-semibold">{{ t('approvals.columns.creator') }}</span>
            <span class="font-medium text-text">{{ row.createdByName || '-' }}</span>
          </div>
          <div>
            <span class="text-muted block text-xs uppercase font-semibold">{{ t('approvals.columns.submitDate') }}</span>
            <span class="font-medium text-text">{{ formatDate(row.submittedAt) }}</span>
          </div>
          <div>
            <span class="text-muted block text-xs uppercase font-semibold">{{ t('approvals.columns.approvalLevel') }}</span>
            <span class="font-medium text-text">{{ row.approvalLevelLabel || '-' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="pagination-row">
      <span class="muted"
        >{{ t('approvals.pagination.pageInfo', { current: page + 1, total: Math.max(totalPages, 1) }) }}</span
      >
      <div class="actions">
        <button
          class="btn btn-sm"
          type="button"
          :disabled="isLoading || !hasPreviousPage"
          @click="previousPage"
        >
          {{ t('approvals.pagination.prev') }}
        </button>
        <button
          class="btn btn-sm"
          type="button"
          :disabled="isLoading || !hasNextPage"
          @click="nextPage"
        >
          {{ t('approvals.pagination.next') }}
        </button>
      </div>
    </div>
  </template>

  <div class="card card-pad mt-4">
    <h3 class="section-title">{{ t('approvals.quickDetail') }}</h3>
    <div v-if="detailLoading" class="muted">{{ t('approvals.loadingDetail') }}</div>
    <div v-else-if="detailError" class="error-state">{{ detailError }}</div>
    <div v-else-if="selectedReceipt" class="detail-grid card card-pad bg-slate-50 border-dashed">
      <div>
        <div class="detail-label">{{ t('approvals.columns.code') }}</div>
        <div class="detail-value text-primary font-bold">{{ selectedReceipt.code }}</div>
      </div>
      <div>
        <div class="detail-label">{{ t('approvals.columns.creator') }}</div>
        <div class="detail-value">{{ selectedReceipt.createdByName }}</div>
      </div>
      <div>
        <div class="detail-label">{{ t('approvals.columns.warehouse') }}</div>
        <div class="detail-value">{{ selectedReceipt.warehouseName }}</div>
      </div>
      <div>
        <div class="detail-label">{{ t('approvals.columns.approvalLevel') }}</div>
        <div class="detail-value">{{ selectedReceipt.approvalLevelLabel }}</div>
      </div>
      <div class="mt-3 flex justify-end w-full" style="grid-column: 1 / -1;">
        <button class="btn btn-sm btn-primary" type="button" @click="goToDetail(selectedReceipt)">
          {{ t('approvals.openFullDetail') }}
        </button>
      </div>
    </div>
    <div v-else class="muted text-center py-4">
      {{ t('approvals.clickToViewQuickDetail') }}
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
.text-link:hover {
  text-decoration: underline;
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
