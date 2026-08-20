<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '../components/PageHeader.vue';
import { getImportReceiptThreshold, updateImportReceiptThreshold } from '../services/systemSettingService';

const { t } = useI18n();

const threshold = ref(50000000);
const isLoading = ref(true);
const isSaving = ref(false);
const message = ref('');
const errorMessage = ref('');

async function loadSettings() {
  isLoading.value = true;
  errorMessage.value = '';
  message.value = '';
  try {
    const data = await getImportReceiptThreshold();
    threshold.value = Number(data.value || 0);
  } catch (error) {
    errorMessage.value = error.message || t('settings.messages.loadError');
  } finally {
    isLoading.value = false;
  }
}

async function handleSave() {
  if (threshold.value < 0 || isNaN(threshold.value)) {
    errorMessage.value = t('settings.messages.invalidValue');
    return;
  }
  
  isSaving.value = true;
  errorMessage.value = '';
  message.value = '';
  try {
    await updateImportReceiptThreshold(threshold.value);
    message.value = t('settings.messages.saveSuccess');
    // Clear success message after 4 seconds
    setTimeout(() => {
      if (message.value === t('settings.messages.saveSuccess')) {
        message.value = '';
      }
    }, 4000);
  } catch (error) {
    errorMessage.value = error.message || t('settings.messages.saveError');
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <PageHeader
    :title="t('settings.title')"
    :description="t('settings.description')"
  />

  <div class="card card-pad max-w-xl mt-6">
    <div v-if="isLoading" class="flex items-center gap-2 text-slate-500 py-6 justify-center">
      <i class="mdi mdi-loading mdi-spin text-2xl"></i>
      <span>Đang tải cấu hình...</span>
    </div>
    
    <div v-else>
      <div v-if="message" class="alert alert-success p-3 rounded-lg mb-4 text-sm font-semibold flex items-center gap-2" style="background: var(--color-success-soft); color: var(--color-success); border: 1px solid var(--color-success);">
        <i class="mdi mdi-check-circle-outline text-lg"></i>
        <span>{{ message }}</span>
      </div>
      
      <div v-if="errorMessage" class="alert alert-danger p-3 rounded-lg mb-4 text-sm font-semibold flex items-center gap-2" style="background: var(--color-danger-soft); color: var(--color-danger); border: 1px solid var(--color-danger);">
        <i class="mdi mdi-alert-circle-outline text-lg"></i>
        <span>{{ errorMessage }}</span>
      </div>

      <form @submit.prevent="handleSave" class="space-y-6">
        <div class="form-field flex flex-col gap-2">
          <label class="font-bold text-sm text-text-primary">
            {{ t('settings.thresholdLabel') }} <span style="color: var(--color-danger)">*</span>
          </label>
          
          <input
            v-model.number="threshold"
            type="number"
            min="0"
            class="import-receipt-form__input"
            style="width: 100%; min-height: 40px; padding: 8px 12px; border: 1px solid var(--color-border-strong); border-radius: 8px; font-size: 14px; background: var(--color-surface); color: var(--color-text-primary);"
            required
          />
          
          <p class="text-xs" style="line-height: 1.5; color: var(--color-text-secondary); margin-top: 4px;">
            {{ t('settings.thresholdDescription') }}
          </p>
        </div>
        
        <div class="flex justify-end pt-2">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="isSaving"
            style="padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;"
          >
            <i v-if="isSaving" class="mdi mdi-loading mdi-spin"></i>
            <i v-else class="mdi mdi-content-save-outline"></i>
            <span>{{ isSaving ? t('settings.saving') : t('settings.saveButton') }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-field input:focus {
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
