<script setup>
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  emptyText: { type: String, default: 'Chưa có dữ liệu' },
})
</script>

<template>
  <div class="table-wrap card">
    <table class="data-table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">
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
          <td v-for="column in columns" :key="column.key">
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
.empty-cell { text-align: center; color: var(--muted); padding: 32px; }
</style>
