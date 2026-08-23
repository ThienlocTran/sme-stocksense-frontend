<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '../components/PageHeader.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { useAuthStore } from '../stores/auth';
import { getEmployees } from '../services/employeeService';
import {
  getImportReceiptThreshold,
  updateImportReceiptThreshold,
  getImportReceiptThresholdHistory
} from '../services/systemSettingService';

const { t, locale } = useI18n();
const authStore = useAuthStore();

// Permissions
const canEdit = computed(() => authStore.currentRole === 'ADMIN');

// States
const threshold = ref(0);
const reason = ref('');
const historyList = ref([]);
const employeeMap = ref({});
const isLoading = ref(true);
const isSaving = ref(false);

const isConfirmOpen = ref(false);

const toast = reactive({
  show: false,
  message: '',
  color: 'success'
});

function showToast(message, color = 'success') {
  toast.message = message;
  toast.color = color;
  toast.show = true;
}

// Format Currency based on active locale
function formatCurrency(value) {
  const num = Number(value);
  if (isNaN(num)) return '—';
  
  if (locale.value === 'vi') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(num);
  } else {
    // English locale format for VND
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'VND',
      currencyDisplay: 'symbol'
    }).format(num);
  }
}

// Format Date based on active locale
function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Load data
async function loadData() {
  isLoading.value = true;
  try {
    // Load setting value
    const settingData = await getImportReceiptThreshold();
    threshold.value = Number(settingData.value || 0);

    // Load employees to map IDs to names
    try {
      const empData = await getEmployees({ page: 0, size: 100 });
      if (empData && empData.content) {
        empData.content.forEach(emp => {
          employeeMap.value[emp.id] = emp.hoTen || emp.fullName || emp.username || emp.id;
        });
      }
    } catch (err) {
      console.error('Failed to load employee list for name mapping:', err);
    }

    // Load history
    await loadHistory();
  } catch (error) {
    showToast(error.message || t('settings.messages.loadError'), 'error');
  } finally {
    isLoading.value = false;
  }
}

async function loadHistory() {
  try {
    const historyData = await getImportReceiptThresholdHistory();
    historyList.value = Array.isArray(historyData) ? historyData : [];
  } catch (error) {
    console.error('Failed to load settings history:', error);
  }
}

function triggerSave() {
  const valueNum = Number(threshold.value);
  if (isNaN(valueNum) || valueNum <= 0) {
    showToast(t('settings.messages.invalidValue'), 'error');
    return;
  }

  if (!reason.value.trim()) {
    showToast(t('settings.messages.errorReasonRequired'), 'error');
    return;
  }

  isConfirmOpen.value = true;
}

async function handleConfirmSave() {
  isConfirmOpen.value = false;
  isSaving.value = true;
  try {
    await updateImportReceiptThreshold(threshold.value, reason.value.trim());
    showToast(t('settings.messages.saveSuccess'), 'success');
    reason.value = ''; // clear reason after success
    await loadHistory();
  } catch (error) {
    showToast(error.message || t('settings.messages.saveError'), 'error');
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="page-container page-shell">
    <PageHeader
      :title="t('settings.title')"
      :description="t('settings.description')"
    />

    <div class="settings-workspace grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 animate-in fade-in duration-200">
      <!-- Left column: config form -->
      <div class="lg:col-span-1">
        <div class="card card-pad">
          <h3 class="text-base font-bold mb-4 text-zinc-900 dark:text-zinc-50 border-b pb-2">
            {{ t('settings.thresholdLabel') }}
          </h3>

          <div v-if="isLoading" class="flex items-center gap-2 text-slate-500 py-6 justify-center">
            <i class="mdi mdi-loading mdi-spin text-2xl"></i>
            <span>{{ t('inventoryCounts.loading') }}</span>
          </div>

          <div v-else>
            <form @submit.prevent="triggerSave" class="space-y-4">
              <!-- Threshold value field -->
              <div class="form-field flex flex-col gap-1.5">
                <label class="font-bold text-xs text-zinc-700 dark:text-zinc-300">
                  {{ t('settings.thresholdLabel') }} <span style="color: var(--color-danger)">*</span>
                </label>
                
                <input
                  v-model.number="threshold"
                  type="number"
                  min="1"
                  step="any"
                  class="input"
                  style="width: 100%; min-height: 40px; padding: 8px 12px; border-radius: 8px; font-size: 14px;"
                  required
                  :disabled="!canEdit || isSaving"
                />
                
                <div class="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                  {{ formatCurrency(threshold) }}
                </div>

                <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-normal mt-1">
                  {{ t('settings.thresholdDescription') }}
                </p>
              </div>

              <!-- Reason input (only if ADMIN can edit) -->
              <div v-if="canEdit" class="form-field flex flex-col gap-1.5 pt-2">
                <label class="font-bold text-xs text-zinc-700 dark:text-zinc-300">
                  {{ t('settings.changeReason') }} <span style="color: var(--color-danger)">*</span>
                </label>
                
                <textarea
                  v-model="reason"
                  class="textarea"
                  style="width: 100%; min-height: 80px; font-size: 13px;"
                  :placeholder="t('settings.changeReasonPlaceholder')"
                  required
                  :disabled="isSaving"
                ></textarea>
              </div>

              <!-- Action submit button (only if ADMIN can edit) -->
              <div v-if="canEdit" class="flex justify-end pt-2">
                <button
                  type="submit"
                  class="btn btn-primary w-full justify-center"
                  :disabled="isSaving"
                  style="min-height: 40px; font-weight: 600;"
                >
                  <i v-if="isSaving" class="mdi mdi-loading mdi-spin mr-1"></i>
                  <i v-else class="mdi mdi-content-save-outline mr-1"></i>
                  <span>{{ isSaving ? t('settings.saving') : t('settings.saveButton') }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Right column: audit trail history -->
      <div class="lg:col-span-2">
        <div class="card">
          <div class="card-header border-b px-6 py-4 bg-zinc-50/50 dark:bg-zinc-800/50 flex items-center justify-between">
            <h3 class="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {{ t('settings.historyTitle') }}
            </h3>
            <button class="btn btn-ghost btn-sm" @click="loadHistory" :disabled="isLoading">
              <i class="mdi mdi-refresh"></i>
            </button>
          </div>

          <div class="history-list-container" style="max-height: 500px; overflow-y: auto;">
            <div v-if="isLoading" class="p-6 text-center text-zinc-500">
              <i class="mdi mdi-loading mdi-spin text-2xl"></i>
            </div>
            <div v-else-if="historyList.length === 0" class="p-6 text-center text-zinc-400">
              — {{ t('inventoryCounts.noCountsTitle') }} —
            </div>
            <div v-else class="overflow-x-auto">
              <table class="table min-w-full">
                <thead>
                  <tr class="border-b bg-zinc-50/20 dark:bg-zinc-800/10">
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('settings.changedAt') }}</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('settings.changedBy') }}</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('settings.oldValue') }}</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('settings.newValue') }}</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{{ t('settings.reason') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <tr v-for="(h, idx) in historyList" :key="idx" class="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10">
                    <td class="px-4 py-3 text-xs font-mono text-zinc-600 dark:text-zinc-400 cell-nowrap">
                      {{ formatDate(h.changedAt) }}
                    </td>
                    <td class="px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {{ employeeMap[h.changedById] || h.changedById || 'System' }}
                    </td>
                    <td class="px-4 py-3 text-sm text-right font-mono text-zinc-600 dark:text-zinc-400">
                      {{ formatCurrency(h.oldValue) }}
                    </td>
                    <td class="px-4 py-3 text-sm text-right font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                      {{ formatCurrency(h.newValue) }}
                    </td>
                    <td class="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 max-w-xs break-words">
                      {{ h.reason }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Save Dialog -->
    <ConfirmDialog
      :open="isConfirmOpen"
      :title="t('settings.confirmUpdateTitle')"
      :message="t('settings.confirmUpdateMessage')"
      :confirmText="t('inventoryCountDetail.finalizeConfirm')"
      @cancel="isConfirmOpen = false"
      @confirm="handleConfirmSave"
    />

    <!-- Toast Notification -->
    <v-snackbar
      v-model="toast.show"
      :color="toast.color === 'error' ? 'red-darken-2' : 'teal-darken-3'"
      timeout="3000"
      rounded="lg"
      elevation="4"
    >
      <div class="flex items-center gap-2">
        <i class="mdi" :class="toast.color === 'error' ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline'"></i>
        <span>{{ toast.message }}</span>
      </div>
    </v-snackbar>
  </div>
</template>

<style scoped>
.form-field input:focus,
.form-field textarea:focus {
  outline: none;
  border-color: var(--color-primary) !important;
  box-shadow: 0 0 0 3px var(--color-primary-soft);
}

.mdi-spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
