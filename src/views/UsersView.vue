<script setup>
import { computed, reactive, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import SearchFilterBar from '../components/SearchFilterBar.vue'
import DataTable from '../components/DataTable.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useInventoryStore, roles } from '../data/useInventoryStore'

const store = useInventoryStore()
const q = ref('')
const role = ref('')
const status = ref('')
const showForm = ref(false)
const form = reactive({ id: '', name: '', email: '', phone: '', role: 'Nhân viên kho', status: 'Đang hoạt động', note: '' })
const columns = [
  { key: 'id', label: 'Mã nhân viên' },
  { key: 'name', label: 'Họ tên' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Số điện thoại' },
  { key: 'role', label: 'Vai trò' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'actions', label: 'Thao tác' },
]
const rows = computed(() => store.users.filter(item =>
  `${item.name} ${item.email} ${item.phone}`.toLowerCase().includes(q.value.toLowerCase()) &&
  (!role.value || item.role === role.value) &&
  (!status.value || item.status === status.value)
))
function openForm(user) {
  Object.assign(form, user || { id: '', name: '', email: '', phone: '', role: 'Nhân viên kho', status: 'Đang hoạt động', note: '' })
  showForm.value = true
}
function save() {
  store.saveUser({ ...form })
  showForm.value = false
}
</script>

<template>
  <PageHeader title="Nhân viên & phân quyền" description="Quản lý nhân viên và chọn vai trò cơ bản, không cấu hình quyền chi tiết.">
    <button class="btn btn-primary" @click="openForm()"><i class="mdi mdi-account-plus-outline"></i>Thêm nhân viên</button>
  </PageHeader>
  <SearchFilterBar v-model="q" placeholder="Tìm theo tên, email hoặc số điện thoại">
    <select v-model="role" class="select"><option value="">Tất cả vai trò</option><option v-for="item in roles" :key="item">{{ item }}</option></select>
    <select v-model="status" class="select"><option value="">Tất cả trạng thái</option><option>Đang hoạt động</option><option>Tạm khóa</option></select>
  </SearchFilterBar>
  <DataTable :columns="columns" :rows="rows">
    <template #status="{ value }"><StatusBadge :status="value" /></template>
    <template #actions="{ row }"><button class="btn btn-sm" @click="openForm(row)">Sửa</button></template>
  </DataTable>
  <div v-if="showForm" class="modal-backdrop">
    <div class="modal">
      <div class="modal-head between">
        <h2 class="section-title">{{ form.id ? 'Sửa nhân viên' : 'Thêm nhân viên' }}</h2>
        <button class="btn btn-icon" @click="showForm = false" aria-label="Đóng"><i class="mdi mdi-close"></i></button>
      </div>
      <div class="modal-body grid grid-2">
        <label class="field"><span>Họ tên</span><input v-model="form.name" class="input" placeholder="Nhập họ tên" /></label>
        <label class="field"><span>Email</span><input v-model="form.email" class="input" placeholder="Nhập email" /></label>
        <label class="field"><span>Số điện thoại</span><input v-model="form.phone" class="input" placeholder="Nhập số điện thoại" /></label>
        <label class="field"><span>Vai trò</span><select v-model="form.role" class="select"><option v-for="item in roles" :key="item">{{ item }}</option></select></label>
        <label class="field"><span>Trạng thái</span><select v-model="form.status" class="select"><option>Đang hoạt động</option><option>Tạm khóa</option></select></label>
        <label class="field"><span>Ghi chú</span><input v-model="form.note" class="input" placeholder="Ghi chú nếu cần" /></label>
      </div>
      <div class="modal-foot"><button class="btn" @click="showForm = false">Hủy</button><button class="btn btn-primary" @click="save">Lưu</button></div>
    </div>
  </div>
</template>
