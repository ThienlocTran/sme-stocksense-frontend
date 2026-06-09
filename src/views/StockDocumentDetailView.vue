<script setup>
import { computed, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import StatusBadge from '../components/StatusBadge.vue'
import DataTable from '../components/DataTable.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useInventoryStore } from '../data/useInventoryStore'

const props = defineProps({ id: { type: String, required: true }, type: { type: String, required: true } })
const store = useInventoryStore()
const reason = ref('')
const showReject = ref(false)
const doc = computed(() => store.findDocument(props.id))
const canApprove = computed(() => doc.value?.status === 'Chờ duyệt' && ['Quản lý kho', 'Admin / IT'].includes(store.currentRole))
const canCreateAndSubmit = computed(() => store.isAdmin || store.isStaff)
const canEdit = computed(() => ['Nháp', 'Từ chối'].includes(doc.value?.status) && canCreateAndSubmit.value)
const itemColumns = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Tên sản phẩm' },
  { key: 'unit', label: 'Đơn vị tính' },
  { key: 'qty', label: 'Số lượng' },
  { key: 'price', label: 'Đơn giá' },
  { key: 'total', label: 'Thành tiền' },
]
function reject() {
  if (!reason.value.trim()) return
  store.rejectDocument(doc.value.id, reason.value)
  showReject.value = false
  reason.value = ''
}
</script>

<template>
  <template v-if="doc">
    <PageHeader :title="`${doc.type} ${doc.id}`" description="Chi tiết phiếu và lịch sử xử lý theo workflow duyệt kho.">
      <div class="actions">
        <button v-if="canEdit" class="btn">Sửa lại</button>
        <button v-if="canCreateAndSubmit && doc.status === 'Nháp'" class="btn btn-danger" @click="store.cancelDocument(doc.id)">Xóa</button>
        <button v-if="canCreateAndSubmit && (doc.status === 'Nháp' || doc.status === 'Từ chối')" class="btn btn-primary" @click="store.submitDocument(doc.id)">Gửi duyệt{{ doc.status === 'Từ chối' ? ' lại' : '' }}</button>
        <button v-if="canApprove" class="btn btn-success" @click="store.approveDocument(doc.id)">Chấp nhận</button>
        <button v-if="canApprove" class="btn btn-danger" @click="showReject = true">Từ chối</button>
      </div>
    </PageHeader>
    <section class="grid grid-2">
      <div class="card card-pad stack">
        <h2 class="section-title">Thông tin phiếu</h2>
        <div class="detail-grid">
          <span>Mã phiếu</span><strong>{{ doc.id }}</strong>
          <span>Loại phiếu</span><strong>{{ doc.type }}</strong>
          <span>Trạng thái</span><StatusBadge :status="doc.status" />
          <span>Kho</span><strong>{{ doc.warehouse }}</strong>
          <span>Đối tác / Nhà cung cấp / Khách hàng</span><strong>{{ doc.partner }}</strong>
          <span>Người tạo</span><strong>{{ doc.creator }}</strong>
          <span>Ngày tạo</span><strong>{{ doc.createdAt }}</strong>
          <span>Ngày gửi duyệt</span><strong>{{ doc.submittedAt || 'Chưa gửi' }}</strong>
          <span>Người duyệt</span><strong>{{ doc.approver || 'Chưa có' }}</strong>
          <span>Ngày duyệt</span><strong>{{ doc.approvedAt || 'Chưa có' }}</strong>
          <span>Ghi chú</span><strong>{{ doc.note || 'Không có' }}</strong>
          <span v-if="doc.rejectionReason">Lý do từ chối</span><strong v-if="doc.rejectionReason" class="danger-text">{{ doc.rejectionReason }}</strong>
        </div>
      </div>
      <div class="card card-pad">
        <h2 class="section-title">Lịch sử xử lý phiếu</h2>
        <ul class="timeline">
          <li v-for="item in doc.history" :key="item.time + item.action">
            <span class="dot"></span>
            <div><strong>{{ item.action }}</strong><p class="muted">{{ item.time }} · {{ item.actor }}</p></div>
          </li>
        </ul>
      </div>
    </section>
    <section class="stack document-items">
      <h2 class="section-title">Danh sách sản phẩm trong phiếu</h2>
      <DataTable :columns="itemColumns" :rows="doc.items">
        <template #price="{ value }">{{ value.toLocaleString('vi-VN') }} đ</template>
        <template #total="{ row }">{{ (row.qty * row.price).toLocaleString('vi-VN') }} đ</template>
      </DataTable>
    </section>
    <ConfirmDialog :open="showReject" title="Từ chối phiếu" message="Vui lòng nhập lý do từ chối để nhân viên kho sửa lại phiếu." confirm-text="Từ chối" danger @cancel="showReject = false" @confirm="reject">
      <textarea v-model="reason" class="textarea" placeholder="Nhập lý do từ chối bắt buộc"></textarea>
    </ConfirmDialog>
  </template>
</template>

<style scoped>
.detail-grid { display: grid; grid-template-columns: 180px 1fr; gap: 10px 16px; align-items: center; }
.detail-grid span { color: var(--muted); }
.danger-text { color: var(--danger); }
.document-items { margin-top: 16px; }
</style>
