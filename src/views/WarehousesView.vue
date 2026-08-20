<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import DataTable from "../components/DataTable.vue";
import EmptyState from "../components/EmptyState.vue";
import PageHeader from "../components/PageHeader.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import StatusBadge from "../components/StatusBadge.vue";
import {
  getWarehouseStatusLabel,
  warehouseStatusOptions,
} from "../constants/warehouseOptions";
import { canManageWarehouses } from "../services/permissionService";
import {
  createWarehouse,
  getWarehouses,
  updateWarehouse,
} from "../services/warehouseService";

const router = useRouter();
const { t } = useI18n();
const warehouses = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);
const togglingId = ref(null);
const pendingWarehouse = ref(null);
const isFormOpen = ref(false);
const formMode = ref("create");
const errorMessage = ref("");
const successMessage = ref("");
const saveErrorMessage = ref("");
const searchDraft = ref("");
const filters = reactive({ keyword: "", status: "" });

const statusOptions = [
  { value: "", label: t("warehouse.filter.allStatus") },
  ...warehouseStatusOptions,
];
const canManage = computed(() => canManageWarehouses());
const isEditMode = computed(() => formMode.value === "edit");
const formTitle = computed(() =>
  isEditMode.value ? t("warehouse.form.titleEdit") : t("warehouse.form.titleCreate"),
);
const hasActiveFilters = computed(
  () => filters.keyword !== "" || filters.status !== "",
);
const confirmTitle = computed(() =>
  pendingWarehouse.value?.trangThai === "HOAT_DONG"
    ? "Ngừng hoạt động kho?"
    : "Kích hoạt kho?",
);
const confirmMessage = computed(() =>
  pendingWarehouse.value
    ? pendingWarehouse.value ? (pendingWarehouse.value.trangThai === "HOAT_DONG" ? t("warehouse.confirm.msgDeactivate", { name: pendingWarehouse.value.tenKho }) : t("warehouse.confirm.msgActivate", { name: pendingWarehouse.value.tenKho })) : ""
    : "",
);

const columns = computed(() => {
  return [
    { key: "tenKho", label: t("warehouse.table.name"), class: "cell-long" },
    { key: "diaChi", label: t("warehouse.table.address"), class: "cell-medium" },
    { key: "trangThai", label: t("warehouse.table.status"), class: "cell-nowrap" },
    { key: "actions", label: t("warehouse.table.actions"), class: "cell-nowrap" },
  ];
});

const form = reactive(createEmptyForm());
const formErrors = reactive({
  maKho: "",
  tenKho: "",
  diaChi: "",
  trangThai: "",
});

onMounted(fetchWarehouses);

async function fetchWarehouses() {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    warehouses.value =
      (await getWarehouses({
        keyword: filters.keyword,
        status: filters.status,
      })) || [];
  } catch (error) {
    warehouses.value = [];
    errorMessage.value = error.message;
    if (error.status === 401) router.replace("/login");
  } finally {
    isLoading.value = false;
  }
}

function applySearch() {
  filters.keyword = searchDraft.value.trim();
  fetchWarehouses();
}

function applyFilter() {
  fetchWarehouses();
}

function clearFilters() {
  searchDraft.value = "";
  filters.keyword = "";
  filters.status = "";
  fetchWarehouses();
}

function createEmptyForm() {
  return { id: "", maKho: "", tenKho: "", diaChi: "", trangThai: "HOAT_DONG" };
}

function openCreateForm() {
  if (!canManage.value) return;
  formMode.value = "create";
  Object.assign(form, createEmptyForm());
  successMessage.value = "";
  clearFormFeedback();
  isFormOpen.value = true;
}

function openEditForm(warehouse) {
  if (!canManage.value) return;
  formMode.value = "edit";
  Object.assign(form, {
    id: warehouse.id,
    maKho: warehouse.maKho || "",
    tenKho: warehouse.tenKho || "",
    diaChi: warehouse.diaChi || "",
    trangThai: warehouse.trangThai || "HOAT_DONG",
  });
  successMessage.value = "";
  clearFormFeedback();
  isFormOpen.value = true;
}

function closeForm() {
  if (isSaving.value) return;
  isFormOpen.value = false;
}

function clearFormFeedback() {
  saveErrorMessage.value = "";
  Object.keys(formErrors).forEach((key) => {
    formErrors[key] = "";
  });
}

function applyBackendErrors(errors = {}) {
  Object.keys(formErrors).forEach((key) => {
    formErrors[key] = errors?.[key] || "";
  });
}

function validateForm() {
  clearFormFeedback();
  let isValid = true;

  if (!isEditMode.value) {
    if (!form.maKho.trim()) {
      formErrors.maKho = t("warehouse.error.codeEmpty");
      isValid = false;
    } else if (form.maKho.trim().length > 50) {
      formErrors.maKho = t("warehouse.error.codeMax");
      isValid = false;
    }
  }

  if (!form.tenKho.trim()) {
    formErrors.tenKho = t("warehouse.error.nameEmpty");
    isValid = false;
  } else if (form.tenKho.trim().length > 150) {
    formErrors.tenKho = t("warehouse.error.nameMax");
    isValid = false;
  }

  if (form.diaChi && form.diaChi.trim().length > 255) {
    formErrors.diaChi = t("warehouse.error.addressMax");
    isValid = false;
  }

  if (!form.trangThai) {
    formErrors.trangThai = t("warehouse.error.statusEmpty");
    isValid = false;
  }

  return isValid;
}

async function submitWarehouseForm() {
  if (!canManage.value) return;
  if (!validateForm()) return;

  isSaving.value = true;
  saveErrorMessage.value = "";

  try {
    if (isEditMode.value) {
      await updateWarehouse(form.id, {
        tenKho: form.tenKho.trim(),
        diaChi: form.diaChi ? form.diaChi.trim() : null,
        trangThai: form.trangThai,
      });
      successMessage.value = t("warehouse.msg.successUpdate");
    } else {
      await createWarehouse({
        maKho: form.maKho.trim(),
        tenKho: form.tenKho.trim(),
        diaChi: form.diaChi ? form.diaChi.trim() : null,
        trangThai: form.trangThai,
      });
      successMessage.value = t("warehouse.msg.successCreate");
    }

    isFormOpen.value = false;
    await fetchWarehouses();
  } catch (error) {
    if (error.status === 401) {
      isFormOpen.value = false;
      router.replace("/login");
      return;
    }
    saveErrorMessage.value = error.message;
    applyBackendErrors(error.errors);
  } finally {
    isSaving.value = false;
  }
}

function requestStatus(warehouse) {
  if (!canManage.value || togglingId.value) return;
  pendingWarehouse.value = warehouse;
}

async function confirmStatus() {
  const warehouse = pendingWarehouse.value;
  if (!warehouse || !canManage.value) return;

  const nextStatus =
    warehouse.trangThai === "HOAT_DONG" ? "NGUNG_HOAT_DONG" : "HOAT_DONG";
  togglingId.value = warehouse.id;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await updateWarehouse(warehouse.id, {
      tenKho: warehouse.tenKho,
      diaChi: warehouse.diaChi || null,
      trangThai: nextStatus,
    });
    successMessage.value =
      nextStatus === "HOAT_DONG"
        ? "Đã kích hoạt kho hàng."
        : "Đã ngừng hoạt động kho hàng.";
    pendingWarehouse.value = null;
    await fetchWarehouses();
  } catch (error) {
    errorMessage.value = error.message;
    if (error.status === 401) router.replace("/login");
  } finally {
    togglingId.value = null;
  }
}

function displayStatus(status) {
  return getWarehouseStatusLabel(status);
}
</script>

<template>
  <PageHeader
    :title="t('warehouse.title')"
    :description="t('warehouse.description')"
  >
    <button
      v-if="canManage"
      class="btn btn-primary"
      type="button"
      :disabled="isLoading || isSaving"
      @click="openCreateForm"
      :title="t('warehouse.button.addWarehouseTitle')"
    >
      <i class="mdi mdi-plus"></i>
      Thêm kho
    </button>
  </PageHeader>

  <div v-if="!canManage" class="warehouse-readonly card card-pad">
    <i class="mdi mdi-eye-outline"></i>
    <span>{{ t("warehouse.readonly") }}</span>
  </div>

  <SearchFilterBar
    v-model="searchDraft"
    :placeholder="t('warehouse.searchPlaceholder')"
    @keyup.enter="applySearch"
  >
    <select
      v-model="filters.status"
      class="select"
      :disabled="isLoading"
      @change="applyFilter"
    >
      <option
        v-for="option in statusOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <button
      class="btn btn-primary"
      type="button"
      :disabled="isLoading"
      @click="applySearch"
    >
      <i class="mdi mdi-magnify"></i>
      Tìm kiếm
    </button>
    <button
      v-if="hasActiveFilters"
      class="btn btn-ghost"
      type="button"
      :disabled="isLoading"
      @click="clearFilters"
    >
      <i class="mdi mdi-filter-remove-outline"></i>
      Xóa lọc
    </button>
  </SearchFilterBar>

  <div v-if="successMessage" class="warehouse-success card card-pad">
    <i class="mdi mdi-check-circle-outline"></i>
    <span>{{ successMessage }}</span>
  </div>

  <div v-if="errorMessage" class="warehouse-alert card card-pad">
    <i class="mdi mdi-alert-circle-outline"></i>
    <span>{{ errorMessage }}</span>
  </div>

  <div class="warehouse-table-shell">
    <div v-if="isLoading" class="state-card state-card--loading">
      <div class="state-card__icon">
        <i class="mdi mdi-loading mdi-spin"></i>
      </div>
      <div class="state-card__body">
        <h3>{{ t("warehouse.loading.title") }}</h3>
        <p>{{ t("warehouse.loading.desc") }}</p>
      </div>
    </div>

    <div v-else-if="warehouses.length > 0" class="warehouse-container">
      <div class="warehouse-desktop-table">
        <DataTable
          :columns="columns"
          :rows="warehouses"
          min-width="900px"
        >
          <template #tenKho="{ row }">
            <div class="warehouse-cell">
              <div class="warehouse-icon">
                <i class="mdi mdi-store-24-hour"></i>
              </div>
              <div class="warehouse-info">
                <span class="warehouse-name font-semibold text-slate-800">{{ row.tenKho }}</span>
                <code class="sku-code text-xs text-slate-500">{{ row.maKho }}</code>
              </div>
            </div>
          </template>
          <template #diaChi="{ value }">{{ value || "-" }}</template>
          <template #trangThai="{ value }">
            <StatusBadge :status="displayStatus(value)" />
          </template>
          <template #actions="{ row }">
            <div class="actions">
              <RouterLink
                :to="{ path: '/inventory', query: { warehouseId: row.id } }"
                class="btn btn-sm btn-ghost"
                :title="t('warehouse.table.viewInventoryTitle')"
              >
                <i class="mdi mdi-clipboard-list-outline"></i>
                Xem tồn kho
              </RouterLink>
              <button
                v-if="canManage"
                class="btn btn-sm btn-primary"
                type="button"
                :disabled="isLoading || isSaving"
                @click="openEditForm(row)"
                :title="t('warehouse.table.editTitle')"
              >
                <i class="mdi mdi-pencil-outline"></i>
                Sửa
              </button>
              <button
                v-if="canManage"
                class="btn btn-sm btn-secondary"
                type="button"
                :disabled="isLoading || isSaving || togglingId"
                :title="t('warehouse.table.toggleTitle')"
                @click="requestStatus(row)"
              >
                <i
                  class="mdi"
                  :class="
                    row.trangThai === 'HOAT_DONG'
                      ? 'mdi-block-helper'
                      : 'mdi-check-circle-outline'
                  "
                ></i>
                {{ row.trangThai === "HOAT_DONG" ? t("warehouse.table.deactivate") : t("warehouse.table.activate") }}
              </button>
            </div>
          </template>
        </DataTable>
      </div>

      <div class="warehouse-mobile-list">
        <div v-for="row in warehouses" :key="row.id" class="warehouse-mobile-card card card-pad">
          <div class="warehouse-mobile-card__header">
            <div class="warehouse-cell">
              <div class="warehouse-icon">
                <i class="mdi mdi-store-24-hour"></i>
              </div>
              <div class="warehouse-info">
                <span class="warehouse-name font-semibold text-slate-800">{{ row.tenKho }}</span>
                <code class="sku-code text-xs text-slate-500">{{ row.maKho }}</code>
              </div>
            </div>
            <StatusBadge :status="displayStatus(row.trangThai)" />
          </div>

          <div class="warehouse-mobile-card__body" v-if="row.diaChi">
            <span class="text-xs text-slate-500">{{ t("warehouse.table.addressEmpty") }}</span>
            <p class="text-sm font-medium text-slate-700">{{ row.diaChi }}</p>
          </div>

          <div class="warehouse-mobile-card__actions mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
            <RouterLink
              :to="{ path: '/inventory', query: { warehouseId: row.id } }"
              class="btn btn-sm btn-ghost"
              title="Xem tồn kho tại đây"
            >
              <i class="mdi mdi-clipboard-list-outline"></i>
              Xem tồn
            </RouterLink>
            <button
              v-if="canManage"
              class="btn btn-sm btn-primary"
              type="button"
              :disabled="isLoading || isSaving"
              @click="openEditForm(row)"
              title="Chỉnh sửa thông tin kho hàng"
            >
              <i class="mdi mdi-pencil-outline"></i>
              Sửa
            </button>
            <button
              v-if="canManage"
              class="btn btn-sm btn-secondary"
              type="button"
              :disabled="isLoading || isSaving || togglingId"
              title="Ngừng hoạt động hoặc kích hoạt kho hàng"
              @click="requestStatus(row)"
            >
              <i
                class="mdi"
                :class="
                  row.trangThai === 'HOAT_DONG'
                    ? 'mdi-block-helper'
                    : 'mdi-check-circle-outline'
                "
              ></i>
              {{ row.trangThai === "HOAT_DONG" ? "Ngừng" : "Kích hoạt" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <EmptyState
      v-else-if="!isLoading && !errorMessage"
      :title="t('warehouse.empty.title')"
      :description="
        canManage
          ? 'Thử thay đổi bộ lọc hoặc thêm kho mới.'
          : 'Thử thay đổi bộ lọc để tìm kho phù hợp.'
      "
    />
  </div>

  <div v-if="isFormOpen" class="modal-backdrop">
    <div class="modal warehouse-modal">
      <form class="warehouse-form" @submit.prevent="submitWarehouseForm">
        <div class="modal-head between">
          <div>
            <h2 class="section-title">{{ formTitle }}</h2>
            <p class="modal-desc">
              {{
                isEditMode
                  ? "Cập nhật thông tin kho hàng."
                  : "Tạo kho hàng mới trong hệ thống."
              }}
            </p>
          </div>
          <button
            class="btn btn-icon"
            type="button"
            :disabled="isSaving"
            aria-label="Đóng"
            @click="closeForm"
          >
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="modal-body grid grid-2">
          <div v-if="saveErrorMessage" class="warehouse-form-alert">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>{{ saveErrorMessage }}</span>
          </div>

          <div class="field">
            <label class="field-label font-semibold text-slate-700 block mb-1">{{ t("warehouse.form.labelCode") }}</label>
            <input
              v-model="form.maKho"
              class="input"
              :class="{ 'input-invalid': formErrors.maKho }"
              type="text"
              :placeholder="t('warehouse.form.placeholderCode')"
              :disabled="isSaving || isEditMode"
            />
            <small v-if="isEditMode" class="field-note block text-slate-400 mt-1">{{ t("warehouse.form.noteCode") }}</small>
            <small v-if="formErrors.maKho" class="field-error block text-red-600 font-semibold mt-1">{{ formErrors.maKho }}</small>
          </div>

          <div class="field">
            <label class="field-label font-semibold text-slate-700 block mb-1">{{ t("warehouse.form.labelName") }}</label>
            <input
              v-model="form.tenKho"
              class="input"
              :class="{ 'input-invalid': formErrors.tenKho }"
              type="text"
              :placeholder="t('warehouse.form.placeholderName')"
              :disabled="isSaving"
            />
            <small v-if="formErrors.tenKho" class="field-error block text-red-600 font-semibold mt-1">{{ formErrors.tenKho }}</small>
          </div>

          <div class="field">
            <label class="field-label font-semibold text-slate-700 block mb-1">{{ t("warehouse.form.labelAddress") }}</label>
            <input
              v-model="form.diaChi"
              class="input"
              :class="{ 'input-invalid': formErrors.diaChi }"
              type="text"
              :placeholder="t('warehouse.form.placeholderAddress')"
              :disabled="isSaving"
            />
            <small v-if="formErrors.diaChi" class="field-error block text-red-600 font-semibold mt-1">{{ formErrors.diaChi }}</small>
          </div>

          <div class="field">
            <label class="field-label font-semibold text-slate-700 block mb-1">{{ t("warehouse.form.labelStatus") }}</label>
            <select
              v-model="form.trangThai"
              class="select"
              :class="{ 'input-invalid': formErrors.trangThai }"
              :disabled="isSaving"
            >
              <option
                v-for="option in warehouseStatusOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <small v-if="formErrors.trangThai" class="field-error block text-red-600 font-semibold mt-1">{{ formErrors.trangThai }}</small>
          </div>
        </div>

        <div class="modal-foot">
          <button
            class="btn btn-secondary"
            type="button"
            :disabled="isSaving"
            @click="closeForm"
          >
            Hủy
          </button>
          <button class="btn btn-primary" type="submit" :disabled="isSaving">
            <i v-if="isSaving" class="mdi mdi-loading mdi-spin"></i>
            {{ isSaving ? t("warehouse.form.btnSaving") : t("warehouse.form.btnSave") }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <ConfirmDialog
    :open="!!pendingWarehouse"
    :title="confirmTitle"
    :message="confirmMessage"
    :danger="pendingWarehouse?.trangThai === 'HOAT_DONG'"
    :loading="!!togglingId"
    :confirm-text="
      pendingWarehouse?.trangThai === 'HOAT_DONG'
        ? 'Ngừng hoạt động'
        : 'Kích hoạt'
    "
    @cancel="pendingWarehouse = null"
    @confirm="confirmStatus"
  />
</template>

<style scoped>
.warehouse-alert,
.warehouse-success {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.warehouse-alert {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
}
.warehouse-success {
  color: #166534;
  background: #f0fdf4;
  border-color: #bbf7d0;
}
.warehouse-readonly {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #075985;
  background: #f0f9ff;
  border-color: #bae6fd;
}
.warehouse-table-shell {
  position: relative;
}
.warehouse-loading {
  min-height: 220px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: var(--muted);
  font-weight: 700;
}
.mdi-spin {
  animation: spin 0.8s linear infinite;
}
.btn:disabled,
.select:disabled,
.input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
.warehouse-modal {
  width: min(760px, 100%);
}
.warehouse-form {
  margin: 0;
}
.modal-desc {
  margin: 4px 0 0;
  color: var(--muted);
}
.warehouse-form-alert {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 12px;
  font-weight: 600;
}
.field > span {
  color: #374151;
  font-weight: 600;
}
.field-note {
  color: var(--muted);
  font-size: 12px;
  margin-top: 2px;
}
.field-error {
  color: var(--danger);
  font-weight: 600;
  line-height: 18px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 720px) {
  .actions {
    flex-direction: column;
    align-items: stretch;
  }
  .actions .btn {
    width: 100%;
  }
  .modal-foot {
    flex-direction: column-reverse;
  }
  .modal-foot .btn {
    width: 100%;
  }
}

/* Custom Redesigned Warehouse Styles */
.warehouse-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.warehouse-icon {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  display: grid;
  place-items: center;
  color: var(--color-action-primary);
  font-size: 18px;
  flex-shrink: 0;
}
.warehouse-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.warehouse-name {
  font-size: 14px;
  line-height: 1.4;
}
.sku-code {
  font-family: monospace;
  font-size: 11px;
  padding: 1px 4px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  align-self: flex-start;
  width: fit-content;
}

.input-invalid {
  border-color: var(--color-danger) !important;
  box-shadow: 0 0 0 2px var(--color-danger-soft) !important;
}

/* Mobile responsive layout */
.warehouse-mobile-list {
  display: none;
}

@media (max-width: 1023px) {
  .warehouse-desktop-table {
    display: none;
  }
  .warehouse-mobile-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .warehouse-mobile-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .warehouse-mobile-card__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 12px;
  }
  .warehouse-mobile-card__body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .warehouse-mobile-card__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
    border-top: 1px solid var(--color-border);
    padding-top: 12px;
  }
}
</style>
