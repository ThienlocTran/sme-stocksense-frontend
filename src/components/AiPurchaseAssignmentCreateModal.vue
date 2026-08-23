<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { getEmployees } from "../services/employeeService";
import { createAiPurchaseAssignment, retryEmail } from "../services/aiPurchaseAssignmentService";
import { canRunForecast } from "../services/permissionService";
import { useAuthStore } from "../stores/auth";

const props = defineProps({
  show: { type: Boolean, required: true },
  productDetail: { type: Object, default: null },
  warehouseId: { type: [Number, String], required: true },
  warehouses: { type: Array, required: true },
  horizon: { type: [Number, String], required: true },
  recommendation: { type: Object, required: true },
  source: { type: String, required: true }
});

const emit = defineEmits(["update:show", "created"]);

const { t } = useI18n();
const authStore = useAuthStore();

const employees = ref([]);
const selectedEmployeeId = ref("");
const humanRequestedQuantity = ref(0);
const assignmentContent = ref("");
const assignmentErrorMessage = ref("");
const assignmentSuccessMessage = ref("");
const assignmentResult = ref(null);
const isSubmittingAssignment = ref(false);
const isRetryingEmail = ref(false);

const canRun = computed(() => canRunForecast(authStore.currentRole));

// Sync initial human requested quantity when recommendation or show changes
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      selectedEmployeeId.value = "";
      humanRequestedQuantity.value = props.recommendation?.suggestedQty || 0;
      assignmentContent.value = t("forecast.assignment.defaultMessage", { horizon: props.horizon });
      assignmentErrorMessage.value = "";
      assignmentSuccessMessage.value = "";
      assignmentResult.value = null;
    }
  },
  { immediate: true }
);

onMounted(async () => {
  try {
    const data = await getEmployees({ page: 0, size: 100, status: "HOAT_DONG", roleCode: "EMPLOYEE" });
    employees.value = data?.content || [];
  } catch (err) {
    console.error("Failed to load employees for assignment:", err);
  }
});

async function submitAssignment() {
  if (!canRun.value) return;
  assignmentErrorMessage.value = "";
  assignmentSuccessMessage.value = "";

  if (!selectedEmployeeId.value) {
    assignmentErrorMessage.value = t("forecast.assignment.validationSelectEmployee");
    return;
  }
  const qty = Number(humanRequestedQuantity.value);
  if (!humanRequestedQuantity.value || !Number.isInteger(qty) || qty <= 0) {
    assignmentErrorMessage.value = t("forecast.assignment.validationQtyPositive");
    return;
  }

  isSubmittingAssignment.value = true;
  try {
    const payload = {
      productId: Number(props.productDetail?.id),
      warehouseId: Number(props.warehouseId),
      horizonDays: Number(props.horizon),
      modelMetadataId: props.recommendation?.modelMetadataId || null,
      aiSuggestedQuantity: props.recommendation?.suggestedQty || null,
      requestedQuantity: qty,
      receiverId: Number(selectedEmployeeId.value),
      content: assignmentContent.value || null,
      source: props.source || null
    };
    const response = await createAiPurchaseAssignment(payload);
    assignmentResult.value = response;
    assignmentSuccessMessage.value = t("forecast.assignment.createSuccess");
    emit("created", response);
  } catch (error) {
    assignmentErrorMessage.value = error.message || t("forecast.assignment.error");
  } finally {
    isSubmittingAssignment.value = false;
  }
}

async function handleRetryEmail() {
  if (!assignmentResult.value?.id) return;
  isRetryingEmail.value = true;
  assignmentErrorMessage.value = "";
  assignmentSuccessMessage.value = "";
  try {
    const data = await retryEmail(assignmentResult.value.id);
    assignmentResult.value = data;
    assignmentSuccessMessage.value = t("forecast.assignment.retrySuccess");
  } catch (error) {
    assignmentErrorMessage.value = error.message || t("forecast.assignment.retryFailed");
  } finally {
    isRetryingEmail.value = false;
  }
}

function formatQty(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function formatEmployeeOption(emp) {
  if (!emp) return "";
  let name = emp.fullName || emp.email || "";
  // Clean standard role suffixes in parenthesis like (Employee), (Manager), (Admin)
  name = name.replace(/\s*\((employee|admin|manager)\)/gi, "").trim();
  const email = emp.email || "";
  if (!name || name === email) {
    return email;
  }
  if (email) {
    return `${name} — ${email}`;
  }
  return name;
}

function closeModal() {
  emit("update:show", false);
}

function formatReceiverName(result) {
  if (!result) return "";
  const rawName = result.receiverName || result.receiver?.name || result.receiver?.tenNhanVien || "";
  if (rawName) {
    return rawName.replace(/\s*\((employee|admin|manager)\)/gi, "").trim();
  }
  const emp = employees.value.find(e => e.id === result.receiverId);
  if (emp) {
    let cleaned = emp.fullName || emp.email || "";
    cleaned = cleaned.replace(/\s*\((employee|admin|manager)\)/gi, "").trim();
    return cleaned;
  }
  return result.receiverId || "";
}
</script>

<template>
  <div
    v-if="show"
    class="modal-backdrop"
    @click.self="closeModal"
  >
    <div class="modal">
      <div class="modal-head between">
        <div>
          <h2 class="section-title">{{ t('forecast.assignmentModal.title') }}</h2>
          <p class="modal-subtitle">{{ t('forecast.assignmentModal.subtitle') }}</p>
        </div>
        <button
          class="btn btn-icon"
          @click="closeModal"
        >
          <i class="mdi mdi-close"></i>
        </button>
      </div>

      <div class="modal-body space-y-4">
        <template v-if="!assignmentResult">
          <!-- A. Thông tin đề xuất -->
          <div class="p-4 bg-zinc-50 dark:bg-zinc-800/10 rounded border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-wider">{{ t('forecast.assignment.sectionItemInfo') }}</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span class="text-zinc-500 block mb-0.5">{{ t('stockDocument.columns.product') }}:</span>
                <strong class="text-zinc-900 dark:text-zinc-100 font-semibold">
                  [{{ productDetail?.code || '—' }}] {{ productDetail?.name || '—' }}
                </strong>
              </div>
              <div>
                <span class="text-zinc-500 block mb-0.5">{{ t('stockDocument.columns.warehouse') }}:</span>
                <strong class="text-zinc-900 dark:text-zinc-100 font-semibold">
                  [{{ warehouses.find(w => w.id === warehouseId)?.code || '—' }}] {{ warehouses.find(w => w.id === warehouseId)?.name || '—' }}
                </strong>
              </div>
              <div>
                <span class="text-zinc-500 block mb-0.5">{{ t('forecast.assignment.supplier') }}:</span>
                <strong class="text-zinc-900 dark:text-zinc-100 font-semibold">
                  {{ productDetail?.partnerName || t('forecast.assignment.supplierUnknown') }}
                </strong>
              </div>
              <div>
                <span class="text-zinc-500 block mb-0.5">{{ t('forecast.assignment.forecastHorizon') }}:</span>
                <strong class="text-zinc-900 dark:text-zinc-100 font-semibold">
                  {{ horizon }} {{ t('forecast.daysCount', { days: horizon }).replace(/[0-9]/g, '').trim() }}
                </strong>
              </div>
            </div>

            <div v-if="recommendation?.capacityWarning" class="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 font-semibold rounded text-xs border border-amber-200 dark:border-amber-900/30">
              <i class="mdi mdi-alert-outline mr-0.5"></i>
              {{ t('forecast.assignmentModal.capacityWarning', { warning: recommendation.capacityWarning }) }}
            </div>
          </div>

          <!-- B. Quyết định AI và quản lý -->
          <div class="p-4 bg-indigo-50/30 dark:bg-indigo-950/5 rounded border border-indigo-100 dark:border-indigo-900/20 space-y-3">
            <h3 class="text-xs font-bold text-indigo-400 uppercase tracking-wider">{{ t('forecast.assignment.sectionDecisions') }}</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col justify-center">
                <span class="text-xs text-zinc-500">{{ t('forecast.assignment.aiSuggested') }}:</span>
                <strong class="text-lg font-bold text-indigo-700 dark:text-indigo-400 mt-1">
                  {{ formatQty(recommendation?.suggestedQty) }} {{ t('forecast.assignmentModal.productLabel', { product: '' }).replace(/.*:/, '').trim() }}
                </strong>
                <span class="text-[10px] text-zinc-400 mt-0.5" v-if="recommendation?.rawSuggestedQty !== recommendation?.suggestedQty">
                  {{ t('forecast.assignmentModal.rawNeedLabel', { qty: formatQty(recommendation?.rawSuggestedQty) }) }}
                </span>
              </div>

              <div class="field">
                <label class="field-label font-semibold text-xs">{{ t('forecast.assignmentModal.requestedQtyLabel') }}</label>
                <input v-model.number="humanRequestedQuantity" type="number" min="1" class="input w-full mt-1.5" :disabled="isSubmittingAssignment" />
                <span class="text-[10px] text-zinc-400 mt-1 block leading-relaxed">
                  {{ t('forecast.assignmentModal.qtyHelp', { qty: formatQty(recommendation?.suggestedQty) }) }}
                </span>
              </div>
            </div>

            <div v-if="humanRequestedQuantity > recommendation?.suggestedQty" class="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded text-[11px] border border-amber-200 dark:border-amber-900/30">
              <i class="mdi mdi-information-outline mr-0.5"></i>
              {{ t('forecast.assignmentModal.qtyExceedWarning', { qty: formatQty(recommendation?.suggestedQty) }) }}
            </div>
          </div>

          <!-- C. Phân công -->
          <div class="field">
            <label class="field-label font-semibold text-xs">{{ t('forecast.assignmentModal.employeeLabel') }}</label>
            <select v-model="selectedEmployeeId" class="select w-full mt-1.5" :disabled="isSubmittingAssignment">
              <option value="">{{ t('forecast.assignment.selectEmployee') }}</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                {{ formatEmployeeOption(emp) }}
              </option>
            </select>
          </div>

          <!-- D. Chỉ thị -->
          <div class="field mt-3">
            <label class="field-label font-semibold text-xs">{{ t('forecast.assignmentModal.messageLabel') }}</label>
            <textarea v-model="assignmentContent" rows="3" class="textarea w-full mt-1.5" :placeholder="t('forecast.assignmentModal.messagePlaceholder')" :disabled="isSubmittingAssignment"></textarea>
          </div>

          <div v-if="assignmentErrorMessage" class="p-3 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded border border-red-200 dark:border-red-900/30 text-xs mt-2">
            <i class="mdi mdi-alert-circle-outline mr-1"></i>
            {{ assignmentErrorMessage }}
          </div>
        </template>

        <template v-else>
          <!-- Success/Warning Alerts -->
          <div v-if="assignmentResult.emailStatus === 'DA_GUI'" class="p-3 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300 rounded border border-green-200 dark:border-green-900/30 text-xs">
            <i class="mdi mdi-check-circle-outline mr-1"></i>
            {{ t('forecast.assignment.createSuccess') }} {{ t('forecast.assignment.emailSent') }}
          </div>
          <div v-else-if="assignmentResult.emailStatus === 'THAT_BAI'" class="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-900/30 text-xs">
            <div class="flex justify-between items-center gap-2">
              <div class="flex items-center">
                <i class="mdi mdi-alert-outline mr-1"></i>
                <span>{{ t('forecast.assignment.emailFailed') }}</span>
              </div>
              <button
                v-if="canRun"
                class="btn btn-secondary btn-xs shrink-0"
                type="button"
                :disabled="isRetryingEmail"
                @click="handleRetryEmail"
              >
                <i class="mdi mr-0.5" :class="isRetryingEmail ? 'mdi-loading mdi-spin' : 'mdi-email-sync-outline'"></i>
                {{ isRetryingEmail ? t('forecast.assignment.retryingEmail') : t('forecast.assignment.retryEmail') }}
              </button>
            </div>
          </div>
          <div v-else class="p-3 bg-zinc-50 dark:bg-zinc-800/20 text-zinc-800 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-800 text-xs">
            <i class="mdi mdi-clock-outline mr-1"></i>
            {{ t('forecast.assignment.emailPending') }}
          </div>

          <!-- Compact Details Table -->
          <div class="p-4 bg-zinc-50 dark:bg-zinc-800/10 rounded border border-zinc-200 dark:border-zinc-800 text-xs space-y-3">
            <h4 class="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[10px]">{{ t('forecast.assignment.resultTitle') }}</h4>

            <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span class="text-zinc-500">{{ t('forecast.assignment.code') }}:</span>
              <strong class="text-zinc-900 dark:text-zinc-100">{{ assignmentResult.code || assignmentResult.id }}</strong>
            </div>
            <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span class="text-zinc-500">{{ t('forecast.assignment.receiver') }}:</span>
              <strong>
                {{ formatReceiverName(assignmentResult) }}
              </strong>
            </div>
            <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span class="text-zinc-500">{{ t('forecast.assignment.aiQty') }}:</span>
              <strong>{{ formatQty(assignmentResult.aiSuggestedQuantity ?? assignmentResult.aiSuggestedQty) }}</strong>
            </div>
            <div class="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span class="text-zinc-500">{{ t('forecast.assignment.reqQty') }}:</span>
              <strong class="text-zinc-900 dark:text-zinc-100">{{ formatQty(assignmentResult.requestedQuantity) }}</strong>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-zinc-500">{{ t('forecast.assignment.emailStatus') }}:</span>
              <span class="font-semibold" :class="{
                'text-green-600': assignmentResult.emailStatus === 'DA_GUI',
                'text-amber-600': assignmentResult.emailStatus === 'THAT_BAI',
                'text-zinc-500': assignmentResult.emailStatus === 'CHO_GUI'
              }">
                {{ assignmentResult.emailStatus === 'DA_GUI' ? t('forecast.assignment.emailStatusSent') : (assignmentResult.emailStatus === 'THAT_BAI' ? t('forecast.assignment.emailStatusFailed') : t('forecast.assignment.emailStatusPending')) }}
              </span>
            </div>
          </div>

          <!-- General message for retry result/errors -->
          <div v-if="assignmentErrorMessage" class="p-3 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded border border-red-200 dark:border-red-900/30 text-xs">
            <i class="mdi mdi-alert-circle-outline mr-1"></i>
            {{ assignmentErrorMessage }}
          </div>
          <div v-if="assignmentSuccessMessage" class="p-3 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300 rounded border border-green-200 dark:border-green-900/30 text-xs">
            <i class="mdi mdi-check-circle-outline mr-1"></i>
            {{ assignmentSuccessMessage }}
          </div>
        </template>
      </div>

      <div class="modal-foot">
        <template v-if="!assignmentResult">
          <button
            class="btn btn-ghost"
            :disabled="isSubmittingAssignment"
            @click="closeModal"
          >
            {{ t('forecast.assignmentModal.cancelBtn') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="isSubmittingAssignment"
            @click="submitAssignment"
          >
            <i v-if="isSubmittingAssignment" class="mdi mdi-loading mdi-spin mr-1"></i>
            {{ t('forecast.assignmentModal.assignBtn') }}
          </button>
        </template>
        <template v-else>
          <button
            class="btn btn-primary"
            @click="closeModal"
          >
            {{ t('forecast.assignmentModal.closeBtn') }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
