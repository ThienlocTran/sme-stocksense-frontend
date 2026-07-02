<script setup>
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  emptyText: { type: String, default: 'Chưa có dữ liệu' },
  minWidth: { type: String, default: '920px' },
})
</script>

<template>
  <div class="table-wrap card">
    <table class="data-table" :style="{ minWidth }">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" :class="column.class">
            <slot :name="`${column.key}-header`">
              {{ column.label }}
            </slot>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length" class="empty-cell">{{ emptyText }}</td>
        </tr>
        <tr v-for="(row, index) in rows" :key="row.id || row.sku || index">
          <td v-for="column in columns" :key="column.key" :class="column.class">
            <slot :name="column.key" :row="row" :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.empty-cell {
  text-align: center;
  color: var(--muted);
  padding: 32px;
}

.table-wrap {
  overscroll-behavior-x: contain;
}

.data-table th {
  position: sticky;
  top: 0;
  z-index: 1;
}

.data-table tbody tr {
  animation: row-in 160ms ease both;
}

.data-table td {
  overflow-wrap: anywhere;
}

.data-table :deep(.cell-nowrap) {
  white-space: nowrap;
}

.data-table :deep(.cell-compact) {
  width: 1%;
  white-space: nowrap;
}

.data-table :deep(.cell-medium) {
  min-width: 180px;
  max-width: 260px;
}

.data-table :deep(.cell-long) {
  min-width: 220px;
  max-width: 340px;
}

@keyframes row-in {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .data-table tbody tr {
    animation: none;
  }
}
</style>
