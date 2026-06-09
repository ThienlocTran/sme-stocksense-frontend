<script setup>
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'
import { useInventoryStore } from '../data/useInventoryStore'

const store = useInventoryStore()
const previewColumns = [
  { key: 'sku', label: 'SKU' },
  { key: 'product', label: 'Tên sản phẩm' },
  { key: 'unit', label: 'Đơn vị tính' },
  { key: 'warehouse', label: 'Kho' },
  { key: 'quantity', label: 'Số lượng' },
  { key: 'min', label: 'Ngưỡng tối thiểu' },
]
const errorColumns = [
  { key: 'row', label: 'Dòng' },
  { key: 'column', label: 'Cột' },
  { key: 'value', label: 'Giá trị lỗi' },
  { key: 'reason', label: 'Lý do lỗi' },
  { key: 'suggestion', label: 'Gợi ý sửa' },
]
</script>

<template>
  <PageHeader title="Import Excel" description="Import dữ liệu theo đúng file mẫu để giảm lỗi nhập liệu thủ công." />
  <section class="grid grid-3">
    <div class="card card-pad step-card">
      <i class="mdi mdi-download-outline"></i>
      <h2 class="section-title">Tải file mẫu</h2>
      <p class="muted">Người dùng cần nhập dữ liệu theo template chuẩn của hệ thống.</p>
      <button class="btn btn-primary">Tải file mẫu</button>
    </div>
    <div class="card card-pad step-card">
      <i class="mdi mdi-file-upload-outline"></i>
      <h2 class="section-title">Upload Excel</h2>
      <p class="muted">Chỉ nhận file .xlsx dùng đúng cấu trúc cột trong mẫu.</p>
      <button class="btn">Chọn file Excel</button>
    </div>
    <div class="card card-pad step-card">
      <i class="mdi mdi-clipboard-check-outline"></i>
      <h2 class="section-title">Kiểm tra dữ liệu</h2>
      <p class="muted">Hệ thống hiển thị dòng hợp lệ và lỗi để sửa trước khi import.</p>
      <button class="btn">Kiểm tra</button>
    </div>
  </section>
  <section class="stack import-section">
    <div class="between"><h2 class="section-title">Preview dữ liệu hợp lệ</h2><span class="muted">{{ store.importPreview.length }} dòng hợp lệ</span></div>
    <DataTable :columns="previewColumns" :rows="store.importPreview" />
    <div class="between"><h2 class="section-title">Danh sách lỗi</h2><span class="muted">{{ store.importErrors.length }} lỗi cần sửa</span></div>
    <DataTable :columns="errorColumns" :rows="store.importErrors" />
    <div class="actions"><button class="btn btn-primary">Xác nhận import</button><button class="btn">Hủy</button></div>
  </section>
</template>

<style scoped>
.step-card { display: grid; gap: 10px; align-content: start; }
.step-card i { font-size: 30px; color: var(--primary); }
.import-section { margin-top: 18px; }
</style>
