<script setup>
import { computed } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import { useInventoryStore, warehouses } from '../data/useInventoryStore'

const props = defineProps({
  id: { type: String, default: '' },
  mode: { type: String, default: 'create' },
  type: { type: String, required: true },
})
const store = useInventoryStore()
const isIn = computed(() => props.type === 'in')
const document = computed(() => props.id ? store.findDocument(props.id) : null)
const isEdit = computed(() => props.mode === 'edit' && document.value)
const title = computed(() => {
  if (isEdit.value) return isIn.value ? `Chỉnh sửa phiếu nhập kho ${props.id}` : `Chỉnh sửa phiếu xuất kho ${props.id}`
  return isIn.value ? 'Tạo phiếu nhập kho' : 'Tạo phiếu xuất kho'
})
const partnerLabel = computed(() => isIn.value ? 'Nhà cung cấp' : 'Khách hàng')
</script>

<template>
  <PageHeader :title="title" :description="isEdit ? 'Chỉ chỉnh sửa phiếu ở trạng thái Nháp hoặc Từ chối trước khi gửi duyệt lại.' : 'Tạo phiếu ở trạng thái Nháp, sau đó gửi quản lý kho duyệt.'">
    <RouterLink :to="isIn ? '/stock-in' : '/stock-out'" class="btn">Quay lại</RouterLink>
  </PageHeader>
  <div class="card card-pad stack">
    <div class="grid grid-3">
      <label class="field"><span>Kho</span><select class="select"><option v-for="item in warehouses" :key="item" :selected="document?.warehouse === item">{{ item }}</option></select></label>
      <label class="field"><span>{{ partnerLabel }}</span><input class="input" :value="document?.partner" :placeholder="`Nhập tên ${partnerLabel.toLowerCase()}`" /></label>
      <label class="field"><span>Trạng thái</span><input class="input" :value="document?.status || 'Nháp'" disabled /></label>
    </div>
    <label class="field"><span>Ghi chú</span><textarea class="textarea" :value="document?.note" placeholder="Nhập ghi chú cho phiếu"></textarea></label>
    <div class="card">
      <div class="between modal-head">
        <h2 class="section-title">Danh sách sản phẩm trong phiếu</h2>
        <button class="btn btn-sm"><i class="mdi mdi-plus"></i>Thêm dòng</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>SKU</th><th>Tên sản phẩm</th><th>Đơn vị tính</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
          <tbody>
            <tr v-for="item in document?.items || [{ sku: 'SKU-001', name: 'Cà phê rang xay 500g', unit: 'Gói', qty: 20, price: 68000 }]" :key="item.sku">
              <td><input class="input" :value="item.sku" /></td>
              <td>{{ item.name }}</td>
              <td>{{ item.unit }}</td>
              <td><input class="input" :value="item.qty" /></td>
              <td>{{ item.price.toLocaleString('vi-VN') }} đ</td>
              <td>{{ (item.qty * item.price).toLocaleString('vi-VN') }} đ</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="actions">
      <button class="btn">Lưu nháp</button>
      <button class="btn btn-primary">{{ isEdit && document?.status === 'Từ chối' ? 'Gửi duyệt lại' : 'Gửi duyệt' }}</button>
    </div>
  </div>
</template>
