<script setup>
import PageHeader from '../components/PageHeader.vue'
import StatusBadge from '../components/StatusBadge.vue'
</script>

<template>
  <PageHeader
    title="Cảnh báo tồn kho"
    description="Badge mức độ và trạng thái được đồng bộ với hệ thống màu hiện tại để hỗ trợ đọc nhanh khi có dữ liệu cảnh báo từ backend."
  />

  <section class="card card-pad preview-card">
    <div class="preview-grid">
      <div class="preview-group">
        <h2>Severity</h2>
        <div class="badge-list">
          <StatusBadge status="Critical" variant="severity" />
          <StatusBadge status="High" variant="severity" />
          <StatusBadge status="Medium" variant="severity" />
          <StatusBadge status="Low" variant="severity" />
        </div>
      </div>

      <div class="preview-group">
        <h2>Status</h2>
        <div class="badge-list">
          <StatusBadge status="Open" variant="status" />
          <StatusBadge status="Viewed" variant="status" />
          <StatusBadge status="Processed" variant="status" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.preview-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.preview-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.preview-group h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.badge-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 768px) {
  .preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
