<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/PageHeader.vue'
import ImportInspectionPanel from '../components/ImportInspectionPanel.vue'
import StockOutApprovalDetail from '../components/StockOutApprovalDetail.vue'

const props = defineProps({
  type: { type: String, default: 'in' },
  id: { type: String, default: '' },
})

const hasReceiptId = computed(() => String(props.id || '').trim().length > 0)
const { t } = useI18n()
</script>

<template>
  <PageHeader
    :title="type === 'out' ? t('stockDocumentDetail.titleOut') : t('stockDocumentDetail.titleIn')"
    :description="type === 'out' ? t('stockDocumentDetail.descOut') : t('stockDocumentDetail.descIn')"
  />

  <div class="mt-6">
    <template v-if="type === 'in'">
      <ImportInspectionPanel v-if="hasReceiptId" :receiptId="id" />
      <div v-else class="card card-pad">
        <p class="form-alert form-alert-error mb-0">{{ t('stockDocumentDetail.errorNoImportId') }}</p>
      </div>
    </template>
    <template v-else>
      <StockOutApprovalDetail v-if="hasReceiptId" :receiptId="id" />
      <div v-else class="card card-pad">
        <p class="form-alert form-alert-error mb-0">{{ t('stockDocumentDetail.errorNoExportId') }}</p>
      </div>
    </template>
  </div>
</template>