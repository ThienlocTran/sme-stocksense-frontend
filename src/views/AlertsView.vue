<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import PageHeader from "../components/PageHeader.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import DataTable from "../components/DataTable.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import {
  getAlerts,
  markAlertSeen,
  resolveAlert,
} from "../services/alertService";

const router = useRouter();
const alerts = ref([]);
const isLoading = ref(false);
const searchDraft = ref("");
const errorMessage = ref("");
const page = ref(0);
const size = ref(10);
const totalPages = ref(0);
const totalElements = ref(0);
const confirmState = reactive({ open: false, action: "", alert: null });
const actionState = reactive({ loading: false, alertId: null });
const disabledAlertIds = reactive({});

const statusLabels = {
  LOW_STOCK: "Tồn kho thấp",
  OUT_OF_STOCK: "Hết hàng",
  NORMAL: "Bình thường",
  OVER_STOCK: "Tồn kho thừa",
};

const columns = computed(() => [
  { key: "productCode", label: "Mã SP", class: "cell-compact" },
  { key: "productName", label: "Tên sản phẩm" },
  { key: "warehouse", label: "Kho" },
  { key: "currentQuantity", label: "Số lượng", class: "cell-compact" },
  { key: "minStock", label: "Tồn tối thiểu", class: "cell-compact" },
  { key: "status", label: "Trạng thái", class: "cell-nowrap" },
  { key: "lastUpdatedAt", label: "Cập nhật", class: "cell-nowrap" },
  { key: "actions", label: "Thao tác", class: "cell-nowrap" },
]);

const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);

const confirmTitle = computed(() => {
  if (!confirmState.alert) return "Xác nhận";
  const label =
    confirmState.alert.productName ||
    confirmState.alert.productCode ||
    "cảnh báo";
  return confirmState.action === "seen"
    ? `Đánh dấu cảnh báo "${label}" là đã xem?`
    : `Đánh dấu cảnh báo "${label}" là đã xử lý?`;
});

const confirmMessage = computed(() => {
  return confirmState.action === "seen"
    ? "Hành động này sẽ đánh dấu cảnh báo là đã xem và làm mới danh sách."
    : "Hành động này sẽ đánh dấu cảnh báo là đã xử lý và làm mới danh sách.";
});

const confirmText = computed(() =>
  confirmState.action === "seen" ? "Đã xem" : "Đã xử lý",
);
const confirmDanger = computed(() => confirmState.action === "processed");

onMounted(fetchAlerts);

function getAlertId(alert) {
  return alert?.id ?? alert?.alertId ?? alert?.inventoryId ?? null;
}

function statusLabel(status) {
  return statusLabels[status] || status || "-";
}

function statusClass(status) {
  return `status-${String(status || "unknown")
    .toLowerCase()
    .replaceAll("_", "-")}`;
}

function searchAlerts() {
  page.value = 0;
  fetchAlerts();
}

function clearSearch() {
  searchDraft.value = "";
  page.value = 0;
  fetchAlerts();
}

async function fetchAlerts() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const data = await getAlerts({
      page: page.value,
      size: size.value,
      keyword: searchDraft.value,
    });
    alerts.value = data?.content || [];
    totalPages.value = data?.totalPages || 0;
    totalElements.value = data?.totalElements || 0;
  } catch (error) {
    alerts.value = [];
    errorMessage.value = error.message || "Không thể tải cảnh báo.";
    if (error.status === 401) router.replace("/login");
  } finally {
    isLoading.value = false;
  }
}

function openSeenDialog(alert) {
  if (actionState.loading || disabledAlertIds[getAlertId(alert)]) return;
  confirmState.open = true;
  confirmState.action = "seen";
  confirmState.alert = alert;
}

function openProcessedDialog(alert) {
  if (actionState.loading || disabledAlertIds[getAlertId(alert)]) return;
  confirmState.open = true;
  confirmState.action = "processed";
  confirmState.alert = alert;
}

function closeConfirmDialog() {
  confirmState.open = false;
  confirmState.action = "";
  confirmState.alert = null;
}

async function confirmAction() {
  const alert = confirmState.alert;
  if (!alert) return;
  const action = confirmState.action;
  closeConfirmDialog();

  if (action === "seen") {
    await handleMarkSeen(alert);
  } else if (action === "processed") {
    await handleResolve(alert);
  }
}

async function handleMarkSeen(alert) {
  const alertId = getAlertId(alert);
  if (!alertId) return;
  actionState.loading = true;
  actionState.alertId = alertId;
  errorMessage.value = "";

  try {
    await markAlertSeen(alertId);
    await fetchAlerts();
  } catch (error) {
    disabledAlertIds[alertId] = true;
    errorMessage.value =
      error.message || "Không thể cập nhật trạng thái cảnh báo.";
    if (error.status === 401) router.replace("/login");
  } finally {
    actionState.loading = false;
    actionState.alertId = null;
  }
}

async function handleResolve(alert) {
  const alertId = getAlertId(alert);
  if (!alertId) return;
  actionState.loading = true;
  actionState.alertId = alertId;
  errorMessage.value = "";

  try {
    await resolveAlert(alertId);
    await fetchAlerts();
  } catch (error) {
    disabledAlertIds[alertId] = true;
    errorMessage.value =
      error.message || "Không thể cập nhật trạng thái cảnh báo.";
    if (error.status === 401) router.replace("/login");
  } finally {
    actionState.loading = false;
    actionState.alertId = null;
  }
}

function isActionDisabled(alert) {
  return actionState.loading || Boolean(disabledAlertIds[getAlertId(alert)]);
}
</script>

<template>
  <PageHeader
    title="Cảnh báo tồn kho"
    description="Danh sách cảnh báo tồn kho thấp từ backend."
  />

  <div class="page-actions">
    <SearchFilterBar
      v-model="searchDraft"
      placeholder="Tìm mã, tên sản phẩm hoặc kho"
    >
      <button
        class="btn btn-secondary"
        type="button"
        :disabled="isLoading || actionState.loading"
        @click="searchAlerts"
      >
        Tìm
      </button>
      <button
        class="btn btn-light"
        type="button"
        :disabled="isLoading || actionState.loading"
        @click="clearSearch"
      >
        Xóa
      </button>
    </SearchFilterBar>
  </div>

  <div v-if="errorMessage" class="form-alert form-alert-error mb-16">
    {{ errorMessage }}
  </div>

  <DataTable
    :columns="columns"
    :rows="alerts"
    :empty-text="isLoading ? 'Đang tải dữ liệu...' : 'Không có cảnh báo'"
  >
    <template #status="{ row }">
      <span :class="statusClass(row.status)">{{
        statusLabel(row.status)
      }}</span>
    </template>
    <template #lastUpdatedAt="{ row }">
      {{
        row.lastUpdatedAt ? new Date(row.lastUpdatedAt).toLocaleString() : "-"
      }}
    </template>
    <template #actions="{ row }">
      <button
        class="btn btn-sm btn-light"
        type="button"
        :disabled="isActionDisabled(row)"
        @click.stop="openSeenDialog(row)"
      >
        Đã xem
      </button>
      <button
        class="btn btn-sm btn-primary"
        type="button"
        :disabled="isActionDisabled(row)"
        @click.stop="openProcessedDialog(row)"
      >
        Đã xử lý
      </button>
    </template>
  </DataTable>

  <div class="pagination card card-pad" v-if="alerts.length">
    <button
      class="btn btn-light"
      type="button"
      :disabled="!hasPreviousPage || isLoading || actionState.loading"
      @click="
        page -= 1;
        fetchAlerts();
      "
    >
      Trang trước
    </button>
    <span class="pagination-info"
      >Trang {{ page + 1 }} / {{ totalPages }} · Tổng {{ totalElements }} cảnh
      báo</span
    >
    <button
      class="btn btn-light"
      type="button"
      :disabled="!hasNextPage || isLoading || actionState.loading"
      @click="
        page += 1;
        fetchAlerts();
      "
    >
      Trang sau
    </button>
  </div>

  <ConfirmDialog
    :open="confirmState.open"
    :title="confirmTitle"
    :message="confirmMessage"
    :confirm-text="confirmText"
    :danger="confirmDanger"
    :loading="actionState.loading"
    @cancel="closeConfirmDialog"
    @confirm="confirmAction"
  />
</template>
