<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import { cancelDraft, getMyImportReceipts, submitForApproval } from '../services/importReceiptService'
import { cancelExportReceipt, getMyExportReceipts, submitExportReceipt } from '../services/exportReceiptService'

const props = defineProps({ type: { type: String, default: 'in' } })
const router = useRouter()
const receipts = ref([])
const loading = ref(false)
const error = ref('')
const message = ref('')
const page = ref(0)
const size = 10
const totalPages = ref(0)
const totalElements = ref(0)
const filters = reactive({ status: '' })
const actionId = ref(null)
const isOut = computed(() => props.type === 'out')
const title = computed(() => isOut.value ? 'Phiếu xuất kho của tôi' : 'Phiếu nhập kho của tôi')
const noun = computed(() => isOut.value ? 'phiếu xuất' : 'phiếu nhập')
const columns = computed(() => [
  { key: 'code', label: 'Mã phiếu' }, { key: 'warehouseName', label: 'Kho' },
  { key: isOut.value ? 'partnerName' : 'supplierName', label: isOut.value ? 'Đối tác' : 'Nhà cung cấp' },
  { key: 'createdAt', label: 'Ngày tạo' }, { key: 'status', label: 'Trạng thái' },
  { key: 'totalAmount', label: 'Tổng tiền' }, { key: 'actions', label: 'Thao tác' },
])
const statuses = ['NHAP', 'CHO_DUYET_CAP_1', 'CHO_DUYET_CAP_2', 'TU_CHOI', 'HOAN_THANH', 'HUY']
const labels = { NHAP: 'Nháp', CHO_DUYET_CAP_1: 'Chờ duyệt cấp 1', CHO_DUYET_CAP_2: 'Chờ duyệt cấp 2', TU_CHOI: 'Từ chối', HOAN_THANH: 'Hoàn thành', HUY: 'Hủy' }
const editable = status => status === 'NHAP' || status === 'TU_CHOI'
const canSubmit = status => status === 'NHAP' || status === 'TU_CHOI'
const canCancel = status => editable(status)
const previous = computed(() => page.value > 0)
const next = computed(() => page.value + 1 < totalPages.value)

onMounted(load)
watch(() => props.type, () => { page.value = 0; load() })

async function load() {
  loading.value = true; error.value = ''; message.value = ''
  try {
    const data = isOut.value
      ? await getMyExportReceipts({ page: page.value, size, status: filters.status })
      : await getMyImportReceipts({ page: page.value, size, status: filters.status })
    receipts.value = data.content || []
    totalPages.value = data.totalPages || 0
    totalElements.value = data.totalElements || 0
  } catch (e) { error.value = e.message; if (e.status === 401) router.replace('/login') }
  finally { loading.value = false }
}
async function submit(row) {
  if (!confirm(`Gửi duyệt ${noun.value} ${row.code}?`)) return
  actionId.value = row.id; error.value = ''
  try {
    if (isOut.value) await submitExportReceipt(row.id, row.version)
    else await submitForApproval(row.id)
    message.value = 'Gửi duyệt thành công.'; await load()
  } catch (e) { error.value = e.message } finally { actionId.value = null }
}
async function cancel(row) {
  if (!confirm(`Hủy ${noun.value} ${row.code}?`)) return
  actionId.value = row.id; error.value = ''
  try {
    if (isOut.value) await cancelExportReceipt(row.id)
    else await cancelDraft(row.id)
    message.value = 'Hủy phiếu thành công.'; await load()
  } catch (e) { error.value = e.message } finally { actionId.value = null }
}
const routeBase = computed(() => isOut.value ? '/stock-out' : '/stock-in')
const formatDate = v => v ? new Intl.DateTimeFormat('vi-VN').format(new Date(v)) : '-'
const formatMoney = v => `${Number(v || 0).toLocaleString('vi-VN')} đ`
</script>

<template>
  <PageHeader :title="title" :description="`Danh sách ${noun} từ API backend.`">
    <button class="btn btn-primary" @click="router.push(`${routeBase}/create`)"><i class="mdi mdi-plus"></i>Tạo phiếu</button>
  </PageHeader>
  <div class="filter-bar card card-pad">
    <select v-model="filters.status" class="select" @change="page = 0; load()">
      <option value="">Tất cả trạng thái</option><option v-for="s in statuses" :key="s" :value="s">{{ labels[s] }}</option>
    </select>
    <button class="btn btn-ghost" @click="filters.status = ''; page = 0; load()">Xóa lọc</button>
  </div>
  <p v-if="error" class="form-alert form-alert-error">{{ error }}</p>
  <p v-if="message" class="form-alert form-alert-info">{{ message }}</p>
  <p v-if="loading" class="muted">Đang tải danh sách...</p>
  <DataTable :columns="columns" :rows="receipts" :empty-text="`Chưa có ${noun}`">
    <template #createdAt="{ value }">{{ formatDate(value) }}</template>
    <template #status="{ value }"><span class="badge">{{ labels[value] || value }}</span></template>
    <template #totalAmount="{ value }">{{ formatMoney(value) }}</template>
    <template #actions="{ row }"><div class="actions">
      <button v-if="editable(row.status)" class="btn btn-sm" :disabled="actionId === row.id" @click="router.push(`${routeBase}/${row.id}/edit`)">Sửa</button>
      <button v-if="canSubmit(row.status)" class="btn btn-sm" :disabled="actionId === row.id" @click="submit(row)">Gửi duyệt</button>
      <button v-if="canCancel(row.status)" class="btn btn-sm btn-danger" :disabled="actionId === row.id" @click="cancel(row)">Hủy</button>
      <button class="btn btn-sm" @click="router.push(`${routeBase}/${row.id}`)">Xem</button>
    </div></template>
  </DataTable>
  <div class="pagination-bar card card-pad"><span>{{ totalElements }} phiếu</span><div class="actions">
    <button class="btn btn-sm" :disabled="!previous" @click="page--; load()">Trước</button>
    <span>Trang {{ totalPages ? page + 1 : 0 }}/{{ totalPages }}</span>
    <button class="btn btn-sm" :disabled="!next" @click="page++; load()">Sau</button>
  </div></div>
</template>

<style scoped>
.filter-bar,.actions,.pagination-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.filter-bar{margin-bottom:16px}.pagination-bar{justify-content:space-between;margin-top:14px}.form-alert{padding:10px 12px;border-radius:8px}.form-alert-error{background:#fef2f2;color:#b91c1c}.form-alert-info{background:#eff6ff;color:#1d4ed8}.badge{padding:4px 9px;border-radius:999px;background:#f1f5f9;font-weight:700}
</style>
