<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useI18n } from 'vue-i18n';
import { useRouter } from "vue-router";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import PriceInput from "../components/PriceInput.vue";
import DataTable from "../components/DataTable.vue";
import EmptyState from "../components/EmptyState.vue";
import PageHeader from "../components/PageHeader.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import StatusBadge from "../components/StatusBadge.vue";
import SearchableSelect from "../components/SearchableSelect.vue";
import { canManageProducts } from "../services/permissionService";
import {
  createProduct,
  getProduct,
  getProductCategories,
  getProducts,
  getProductSuppliers,
  updateProduct,
  updateProductStatus,
} from "../services/productService";

const router = useRouter();
const { t } = useI18n();
const products = ref([]);
const categories = ref([]);
const suppliers = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);
const togglingId = ref(null);
const pendingProduct = ref(null);
const isFormOpen = ref(false);
const formMode = ref("create");
const errorMessage = ref("");
const successMessage = ref("");
const saveErrorMessage = ref("");
const searchDraft = ref("");

const page = ref(0);
const size = ref(10);
const totalPages = ref(0);
const totalElements = ref(0);
const filters = reactive({ keyword: "", categoryId: "", status: "" });

const canManage = computed(() => canManageProducts());
const isEditMode = computed(() => formMode.value === "edit");
const formTitle = computed(() =>
  isEditMode.value ? t('products.editProduct') : t('products.addProduct'),
);
const hasPreviousPage = computed(() => page.value > 0);
const hasNextPage = computed(() => page.value + 1 < totalPages.value);
const hasActiveFilters = computed(
  () =>
    searchDraft.value.trim() !== "" ||
    filters.categoryId !== "" ||
    filters.status !== "",
);
const confirmTitle = computed(() =>
  pendingProduct.value?.status === "HOAT_DONG" ? t('products.deactivateConfirmTitle') : t('products.activateConfirmTitle'),
);
const confirmMessage = computed(() =>
  pendingProduct.value
    ? pendingProduct.value.status === "HOAT_DONG" ? t('products.confirmDeactivateMsg', { name: pendingProduct.value.name }) : t('products.confirmActivateMsg', { name: pendingProduct.value.name })
    : "",
);

const columns = computed(() => {
  const baseColumns = [
    { key: "code", label: t('products.productCode'), class: "cell-compact" },
    { key: "sku", label: t('products.sku'), class: "cell-compact" },
    { key: "name", label: t('products.productName') },
    { key: "categoryName", label: t('products.category') },
    { key: "partnerName", label: t('products.supplier') },
    { key: "unit", label: t('products.unit'), class: "cell-compact" },
    { key: "unitVolumeM3", label: t('products.unitVolumeM3'), class: "cell-compact" },
    { key: "price", label: t('products.price'), class: "cell-nowrap" },
    { key: "status", label: t('products.status'), class: "cell-nowrap" },
  ];
  return canManage.value
    ? [
        ...baseColumns,
        { key: "actions", label: t('products.actions'), class: "cell-nowrap" },
      ]
    : baseColumns;
});

const filterCategoryOptions = computed(() => {
  return [
    { value: "", label: t('products.allCategories') },
    ...categories.value.map(c => ({
      value: c.id,
      label: c.name || '',
      searchKey: (c.name || '').toLowerCase()
    }))
  ];
});

const formCategoryOptions = computed(() => {
  return [
    { value: "", label: t('products.noSelection') },
    ...categories.value.map(c => ({
      value: c.id,
      label: c.name || '',
      searchKey: (c.name || '').toLowerCase()
    }))
  ];
});

const formSupplierOptions = computed(() => {
  return [
    { value: "", label: t('products.noSelection') },
    ...suppliers.value.map(s => ({
      value: s.id,
      label: s.tenDoiTac || s.name || '',
      sublabel: s.maDoiTac || s.code || s.soDienThoai || '',
      searchKey: `${s.tenDoiTac || s.name || ''} ${s.maDoiTac || s.code || ''}`.toLowerCase()
    }))
  ];
});

const form = reactive(emptyForm());
const formErrors = reactive({
  code: "",
  name: "",
  sku: "",
  barcode: "",
  unit: "",
  price: "",
  unitVolumeM3: "",
  categoryId: "",
  partnerId: "",
  status: "",
});

onMounted(async () => {
  await Promise.all([loadDropdowns(), fetchProducts()]);
});

async function loadDropdowns() {
  try {
    const [categoryData, supplierData] = await Promise.all([
      getProductCategories(),
      getProductSuppliers(),
    ]);
    categories.value = categoryData || [];
    suppliers.value = supplierData || [];
  } catch (error) {
    errorMessage.value = error.message;
    if (error.status === 401) router.replace("/login");
  }
}

async function fetchProducts() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const data = await getProducts({
      page: page.value,
      size: size.value,
      keyword: filters.keyword,
      categoryId: filters.categoryId,
      status: filters.status,
    });
    products.value = data.content || [];
    totalPages.value = data.totalPages || 0;
    totalElements.value = data.totalElements || 0;
  } catch (error) {
    products.value = [];
    errorMessage.value = error.message;
    if (error.status === 401) router.replace("/login");
  } finally {
    isLoading.value = false;
  }
}

function applySearch() {
  filters.keyword = searchDraft.value.trim();
  page.value = 0;
  fetchProducts();
}

function applyFilter() {
  page.value = 0;
  fetchProducts();
}

function clearFilters() {
  searchDraft.value = "";
  filters.keyword = "";
  filters.categoryId = "";
  filters.status = "";
  page.value = 0;
  fetchProducts();
}

function previousPage() {
  if (!hasPreviousPage.value) return;
  page.value -= 1;
  fetchProducts();
}

function nextPage() {
  if (!hasNextPage.value) return;
  page.value += 1;
  fetchProducts();
}

function emptyForm() {
  return {
    id: "",
    code: "",
    name: "",
    sku: "",
    barcode: "",
    unit: "",
    price: "",
    unitVolumeM3: "",
    categoryId: "",
    partnerId: "",
    status: "HOAT_DONG",
  };
}

function openCreateForm() {
  if (!canManage.value) return;
  formMode.value = "create";
  Object.assign(form, emptyForm());
  successMessage.value = "";
  clearFormFeedback();
  isFormOpen.value = true;
}

async function openEditForm(product) {
  if (!canManage.value) return;
  formMode.value = "edit";
  successMessage.value = "";
  clearFormFeedback();
  isFormOpen.value = true;
  try {
    const detail = await getProduct(product.id);
    Object.assign(form, {
      id: detail.id,
      code: detail.code || "",
      name: detail.name || "",
      sku: detail.sku || "",
      barcode: detail.barcode || "",
      unit: detail.unit || "",
      price: detail.price ?? "",
      unitVolumeM3: detail.unitVolumeM3 ?? "",
      categoryId: detail.categoryId || "",
      partnerId: detail.partnerId || "",
      status: detail.status || "HOAT_DONG",
    });
  } catch (error) {
    isFormOpen.value = false;
    errorMessage.value = error.message;
  }
}

function closeForm() {
  if (!isSaving.value) isFormOpen.value = false;
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
  let valid = true;
  if (!form.code.trim()) {
    formErrors.code = t('products.errCodeEmpty');
    valid = false;
  }
  if (!form.name.trim()) {
    formErrors.name = t('products.errNameEmpty');
    valid = false;
  }
  if (!form.unit.trim()) {
    formErrors.unit = t('products.errUnitEmpty');
    valid = false;
  }
  if (form.price === "" || Number(form.price) < 0) {
    formErrors.price = t('products.errPriceInvalid');
    valid = false;
  }
  if (form.unitVolumeM3 !== "" && form.unitVolumeM3 !== null && Number(form.unitVolumeM3) <= 0) {
    formErrors.unitVolumeM3 = t('products.errUnitVolumeInvalid');
    valid = false;
  }
  if (isEditMode.value && !form.status) {
    formErrors.status = t('products.errStatusEmpty');
    valid = false;
  }
  return valid;
}

function toPayload() {
  const payload = {
    code: form.code.trim(),
    name: form.name.trim(),
    sku: form.sku.trim() || null,
    barcode: form.barcode.trim() || null,
    unit: form.unit.trim(),
    price: Number(form.price),
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    partnerId: form.partnerId ? Number(form.partnerId) : null,
    unitVolumeM3: form.unitVolumeM3 === "" || form.unitVolumeM3 === null ? null : Number(form.unitVolumeM3),
  };
  if (isEditMode.value) payload.status = form.status;
  return payload;
}

async function submitForm() {
  if (!canManage.value) return;
  if (!validateForm()) return;
  isSaving.value = true;
  try {
    if (isEditMode.value) {
      await updateProduct(form.id, toPayload());
      successMessage.value = t('products.successUpdate');
    } else {
      await createProduct(toPayload());
      successMessage.value = t('products.successAdd');
    }
    isFormOpen.value = false;
    await fetchProducts();
  } catch (error) {
    saveErrorMessage.value = error.message;
    applyBackendErrors(error.errors);
    if (error.status === 401) router.replace("/login");
  } finally {
    isSaving.value = false;
  }
}

function requestStatus(product) {
  if (!canManage.value || togglingId.value) return;
  pendingProduct.value = product;
}

async function confirmStatus() {
  const product = pendingProduct.value;
  if (!product || !canManage.value) return;

  const nextStatus =
    product.status === "HOAT_DONG" ? "NGUNG_HOAT_DONG" : "HOAT_DONG";
  togglingId.value = product.id;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    await updateProductStatus(product.id, nextStatus);
    successMessage.value =
      nextStatus === "HOAT_DONG"
        ? t('products.successActivate')
        : t('products.successDeactivate');
    pendingProduct.value = null;
    await fetchProducts();
  } catch (error) {
    errorMessage.value = error.message;
    if (error.status === 401) router.replace("/login");
  } finally {
    togglingId.value = null;
  }
}

function displayStatus(status) {
  return status === "HOAT_DONG"
    ? t('products.statusActive')
    : status === "NGUNG_HOAT_DONG"
      ? t('products.statusInactive')
      : status || "-";
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}
</script>

<template>
  <PageHeader
    :title="t('products.pageTitle')"
    :description="t('products.pageDesc')"
  >
    <button
      v-if="canManage"
      class="btn btn-primary"
      type="button"
      :disabled="isLoading || isSaving"
      @click="openCreateForm"
    >
      <i class="mdi mdi-plus"></i>
      {{ t('products.btnAddProduct') }}
    </button>
  </PageHeader>

  <div v-if="!canManage" class="readonly-note card card-pad">
    <i class="mdi mdi-eye-outline"></i>
    <span>{{ t('products.readonlyNote') }}</span>
  </div>

  <SearchFilterBar
    v-model="searchDraft"
    :placeholder="t('products.searchPlaceholder')"
    @keyup.enter="applySearch"
  >
    <SearchableSelect
      v-model="filters.categoryId"
      :options="filterCategoryOptions"
      :placeholder="t('products.allCategories')"
      :disabled="isLoading"
      @change="applyFilter"
    />
    <select
      v-model="filters.status"
      class="select"
      :disabled="isLoading"
      @change="applyFilter"
    >
      <option value="">{{ t('products.allStatuses') }}</option>
      <option value="HOAT_DONG">{{ t('products.statusActive') }}</option>
      <option value="NGUNG_HOAT_DONG">{{ t('products.statusInactive') }}</option>
    </select>
    <button
      class="btn btn-primary"
      type="button"
      :disabled="isLoading"
      @click="applySearch"
    >
      <i class="mdi mdi-magnify"></i>
      {{ t('products.btnSearch') }}
    </button>
    <button
      v-if="hasActiveFilters"
      class="btn btn-ghost"
      type="button"
      :disabled="isLoading"
      @click="clearFilters"
    >
      <i class="mdi mdi-filter-remove-outline"></i>
      {{ t('products.btnClearFilter') }}
    </button>
  </SearchFilterBar>

  <p v-if="errorMessage" class="form-alert form-alert-error">
    {{ errorMessage }}
  </p>
  <p v-if="successMessage" class="form-alert form-alert-success">
    {{ successMessage }}
  </p>

  <div v-if="isLoading" class="state-card state-card--loading">
    <div class="state-card__icon">
      <i class="mdi mdi-loading mdi-spin"></i>
    </div>
    <div class="state-card__body">
      <h3>{{ t('products.loadingTitle') }}</h3>
      <p>{{ t('products.loadingDesc') }}</p>
    </div>
  </div>

  <!-- Table Summary -->
  <div v-if="products.length > 0 && !isLoading" class="table-summary">
    <strong>{{ totalElements }}</strong> {{ t('products.productsFound') }}
  </div>

  <div class="product-desktop-table">
    <DataTable
      v-if="products.length > 0"
      :columns="columns"
      :rows="products"
      min-width="1180px"
      :empty-text="t('products.emptyTable')"
    >
      <template #code="{ value }">
        <code class="sku-code">{{ value }}</code>
      </template>
      <template #sku="{ value }">
        <code class="sku-code text-muted">{{ value || '—' }}</code>
      </template>
      <template #name="{ row }">
        <div class="product-cell">
          <div class="product-thumbnail">
            <i class="mdi mdi-package-variant-closed"></i>
          </div>
          <div class="product-info">
            <span class="product-name">{{ row.name }}</span>
            <span class="product-sub" v-if="row.barcode">Barcode: {{ row.barcode }}</span>
          </div>
        </div>
      </template>
      <template #unitVolumeM3="{ value }">
        <span class="tabular-num" v-if="value !== null && value !== undefined">{{ value }} m³</span>
        <span class="text-slate-400 italic" v-else>{{ t('products.unconfigured') }}</span>
      </template>
      <template #price="{ value }">
        <span class="tabular-num font-semibold text-slate-800">{{ formatCurrency(value) }}</span>
      </template>
      <template #status="{ value }">
        <StatusBadge :status="displayStatus(value)" />
      </template>
      <template v-slot:actions="{ row }" v-if="canManage">
        <div class="actions">
          <button
            v-if="canManage"
            class="btn btn-sm btn-secondary btn-icon-only"
            type="button"
            :title="t('products.editProductTitle')"
            :disabled="isLoading || isSaving"
            @click="openEditForm(row)"
          >
            <i class="mdi mdi-pencil-outline"></i>
          </button>
          <button
            v-if="canManage"
            class="btn btn-sm btn-icon-only"
            type="button"
            :title="row.status === 'HOAT_DONG' ? t('products.deactivate') : t('products.activate')"
            :disabled="isLoading || togglingId"
            @click="requestStatus(row)"
          >
            <i
              class="mdi"
              :class="
                row.status === 'HOAT_DONG'
                  ? 'mdi-block-helper text-red-600'
                  : 'mdi-check-circle-outline text-emerald-600'
              "
            ></i>
          </button>
        </div>
      </template>
    </DataTable>
  </div>

  <div class="product-mobile-list" v-if="products.length > 0">
    <div v-for="row in products" :key="row.id" class="product-mobile-card card card-pad">
      <div class="product-mobile-card__header">
        <div class="product-cell">
          <div class="product-thumbnail">
            <i class="mdi mdi-package-variant-closed"></i>
          </div>
          <div class="product-info">
            <span class="product-name">{{ row.name }}</span>
            <code class="sku-code text-xs">{{ row.code }}</code>
          </div>
        </div>
        <StatusBadge :status="displayStatus(row.status)" />
      </div>

      <div class="product-mobile-card__details">
        <div class="detail-row">
          <span class="detail-label">SKU</span>
          <code class="sku-code text-muted text-xs">{{ row.sku || '—' }}</code>
        </div>
        <div class="detail-row">
          <span class="detail-label">Danh mục</span>
          <span class="detail-val">{{ row.categoryName || '—' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Nhà cung cấp</span>
          <span class="detail-val text-ellipsis">{{ row.partnerName || '—' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Giá / Đơn vị</span>
          <span class="detail-val">
            <strong class="text-slate-800">{{ formatCurrency(row.price) }}</strong>
            <span class="text-muted text-xs"> / {{ row.unit }}</span>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('products.labelUnitVolume') }}</span>
          <span class="detail-val">
            <span class="tabular-num" v-if="row.unitVolumeM3 !== null && row.unitVolumeM3 !== undefined">{{ row.unitVolumeM3 }} m³</span>
            <span class="text-slate-400 italic" v-else>{{ t('products.unconfigured') }}</span>
          </span>
        </div>
      </div>

      <div class="product-mobile-card__actions" v-if="canManage">
        <button
          class="btn btn-sm btn-secondary"
          type="button"
          :disabled="isLoading || isSaving"
          @click="openEditForm(row)"
        >
          <i class="mdi mdi-pencil-outline"></i>
          {{ t('products.edit') }}
        </button>
        <button
          class="btn btn-sm"
          type="button"
          :disabled="isLoading || togglingId"
          @click="requestStatus(row)"
        >
          <i
            class="mdi"
            :class="
              row.status === 'HOAT_DONG'
                ? 'mdi-block-helper text-red-600'
                : 'mdi-check-circle-outline text-emerald-600'
            "
          ></i>
          {{ row.status === 'HOAT_DONG' ? t('products.deactivateShort') : t('products.activate') }}
        </button>
      </div>
    </div>
  </div>

  <EmptyState
    v-if="!isLoading && !errorMessage && products.length === 0"
    :title="t('products.emptyStateTitle')"
    :description="t('products.emptyStateDesc')"
  />

  <div class="pagination-bar card card-pad">
    <span class="muted">{{ totalElements }} {{ t('products.productsCount') }}</span>
    <div class="pagination-actions">
      <button
        class="btn btn-sm"
        type="button"
        :disabled="!hasPreviousPage || isLoading"
        @click="previousPage"
      >
        <i class="mdi mdi-chevron-left"></i>
        {{ t('products.prev') }}
      </button>
      <span class="page-indicator"
        >{{ t('products.page') }} {{ totalPages === 0 ? 0 : page + 1 }}/{{ totalPages }}</span
      >
      <button
        class="btn btn-sm"
        type="button"
        :disabled="!hasNextPage || isLoading"
        @click="nextPage"
      >
        {{ t('products.next') }}
        <i class="mdi mdi-chevron-right"></i>
      </button>
    </div>
  </div>

  <div v-if="isFormOpen" class="modal-backdrop" @click.self="closeForm">
    <form class="modal card card-pad" @submit.prevent="submitForm">
      <div class="modal-head">
        <div>
          <h2>{{ formTitle }}</h2>
          <p class="modal-desc">{{ t('products.modalDesc') }}</p>
        </div>
        <button
          class="btn btn-icon"
          type="button"
          :disabled="isSaving"
          :aria-label="t('products.close')"
          @click="closeForm"
        >
          <i class="mdi mdi-close"></i>
        </button>
      </div>

      <p v-if="saveErrorMessage" class="form-alert form-alert-error">
        {{ saveErrorMessage }}
      </p>

      <div class="form-sections">
        <!-- Section 1: Thông tin cơ bản -->
        <fieldset class="form-fieldset">
          <legend class="form-legend">{{ t('products.sectionBasicInfo') }}</legend>
          <div class="form-grid">
            <div class="field">
              <label class="field-label">{{ t('products.labelProductCode') }}</label>
              <input
                v-model="form.code"
                class="input"
                :class="{ 'input--error': formErrors.code }"
                :disabled="isSaving || isEditMode"
              />
              <small class="field-error">{{ formErrors.code }}</small>
            </div>

            <div class="field">
              <label class="field-label">{{ t('products.labelProductName') }}</label>
              <input
                v-model="form.name"
                class="input"
                :class="{ 'input--error': formErrors.name }"
                :disabled="isSaving"
              />
              <small class="field-error">{{ formErrors.name }}</small>
            </div>

            <div class="field">
              <label class="field-label">{{ t('products.sku') }}</label>
              <input
                v-model="form.sku"
                class="input"
                :class="{ 'input--error': formErrors.sku }"
                :disabled="isSaving"
              />
              <small class="field-error">{{ formErrors.sku }}</small>
            </div>

            <div class="field">
              <label class="field-label">{{ t('products.labelBarcode') }}</label>
              <input
                v-model="form.barcode"
                class="input"
                :class="{ 'input--error': formErrors.barcode }"
                :disabled="isSaving"
              />
              <small class="field-error">{{ formErrors.barcode }}</small>
            </div>
          </div>
        </fieldset>

        <!-- Section 2: Phân loại & Giá cả -->
        <fieldset class="form-fieldset">
          <legend class="form-legend">{{ t('products.sectionCategoryPrice') }}</legend>
          <div class="form-grid">
            <div class="field">
              <label class="field-label">{{ t('products.labelUnit') }}</label>
              <input
                v-model="form.unit"
                class="input"
                :class="{ 'input--error': formErrors.unit }"
                :disabled="isSaving"
              />
              <small class="field-error">{{ formErrors.unit }}</small>
            </div>

            <div class="field">
              <label class="field-label">{{ t('products.labelPrice') }}</label>
              <PriceInput
                v-model="form.price"
                class="input"
                :class="{ 'input--error': formErrors.price }"
                :disabled="isSaving"
              />
              <small class="field-error">{{ formErrors.price }}</small>
            </div>

            <div class="field">
              <label class="field-label">{{ t('products.labelUnitVolume') }}</label>
              <input
                v-model="form.unitVolumeM3"
                class="input"
                type="number"
                step="0.000001"
                min="0.000001"
                :class="{ 'input--error': formErrors.unitVolumeM3 }"
                :disabled="isSaving"
                placeholder="0.0001"
              />
              <small class="field-error">{{ formErrors.unitVolumeM3 }}</small>
            </div>

            <div class="field">
              <label class="field-label">{{ t('products.category') }}</label>
              <SearchableSelect
                v-model="form.categoryId"
                :options="formCategoryOptions"
                :placeholder="t('products.noSelection')"
                :disabled="isSaving"
                :error="formErrors.categoryId"
              />
              <small class="field-error">{{ formErrors.categoryId }}</small>
            </div>

            <div class="field">
              <label class="field-label">{{ t('products.supplier') }}</label>
              <SearchableSelect
                v-model="form.partnerId"
                :options="formSupplierOptions"
                :placeholder="t('products.noSelection')"
                :disabled="isSaving"
                :error="formErrors.partnerId"
              />
              <small class="field-error">{{ formErrors.partnerId }}</small>
            </div>

            <div class="field" v-if="isEditMode">
              <label class="field-label">{{ t('products.status') }} *</label>
              <select
                v-model="form.status"
                class="select"
                :class="{ 'input--error': formErrors.status }"
                :disabled="isSaving"
              >
                <option value="HOAT_DONG">{{ t('products.statusActive') }}</option>
                <option value="NGUNG_HOAT_DONG">{{ t('products.statusInactive') }}</option>
              </select>
              <small class="field-error">{{ formErrors.status }}</small>
            </div>
          </div>
        </fieldset>
      </div>

      <div class="modal-foot">
        <button
          class="btn"
          type="button"
          :disabled="isSaving"
          @click="closeForm"
        >
          Hủy
        </button>
        <button class="btn btn-primary" type="submit" :disabled="isSaving">
          <i v-if="isSaving" class="mdi mdi-loading mdi-spin"></i>
          {{ isSaving ? "Đang lưu" : "Lưu" }}
        </button>
      </div>
    </form>
  </div>

  <ConfirmDialog
    :open="!!pendingProduct"
    :title="confirmTitle"
    :message="confirmMessage"
    :danger="pendingProduct?.status === 'HOAT_DONG'"
    :loading="!!togglingId"
    :confirm-text="
      pendingProduct?.status === 'HOAT_DONG' ? 'Ngừng hoạt động' : 'Kích hoạt'
    "
    @cancel="pendingProduct = null"
    @confirm="confirmStatus"
  />
</template>

<style scoped>
.loading-card {
  min-height: 220px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: var(--muted);
  font-weight: 700;
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
.form-alert-success {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #bbf7d0;
}
.readonly-note {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #075985;
  background: #f0f9ff;
  border-color: #bae6fd;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
  white-space: nowrap;
}
.modal {
  width: min(760px, 100%);
  max-height: 92vh;
  overflow: auto;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}
.modal-head h2 {
  margin: 0;
  font-size: 22px;
}
.modal-desc {
  margin: 4px 0 0;
  color: var(--muted);
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.form-grid label {
  display: grid;
  gap: 6px;
  font-weight: 700;
}
.field-error {
  min-height: 18px;
  color: var(--danger);
  font-weight: 600;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}
.btn:disabled,
.select:disabled,
.input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
.mdi-spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .pagination-bar,
  .pagination-actions {
    align-items: stretch;
    flex-direction: column;
  }
  .modal-foot {
    flex-direction: column-reverse;
  }
  .modal-foot .btn {
    width: 100%;
  }
}

.table-summary {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.product-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.product-thumbnail {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  display: grid;
  place-items: center;
  color: var(--color-text-muted);
  font-size: 18px;
  flex-shrink: 0;
}
.product-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.product-name {
  font-weight: 600;
  color: var(--color-text-primary);
}
.product-sub {
  font-size: 11px;
  color: var(--color-text-muted);
}
.sku-code {
  font-family: monospace;
  font-size: 12px;
  padding: 2px 6px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}
.tabular-num {
  font-variant-numeric: tabular-nums;
}
.unit-label {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-left: 4px;
}
.btn-icon-only {
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.product-mobile-list {
  display: none;
}

@media (max-width: 1023px) {
  .product-desktop-table {
    display: none;
  }
  .product-mobile-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .product-mobile-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }
  .product-mobile-card__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 12px;
  }
  .product-mobile-card__details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    font-size: 13px;
  }
  .detail-label {
    color: var(--color-text-secondary);
    font-weight: 500;
  }
  .detail-val {
    color: var(--color-text-primary);
    font-weight: 600;
  }
  .text-ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }
  .product-mobile-card__actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
    border-top: 1px solid var(--color-border);
    padding-top: 12px;
  }
  .product-mobile-card__actions .btn {
    flex: 1;
    justify-content: center;
  }
}

.form-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form-fieldset {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 18px;
  margin: 0;
}
.form-legend {
  padding: 0 8px;
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.input--error {
  border-color: var(--color-danger) !important;
  background-color: #fdf2f2 !important;
}
</style>
