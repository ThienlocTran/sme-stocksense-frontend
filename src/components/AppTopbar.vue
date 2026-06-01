<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { useInventoryStore, roles } from '../data/useInventoryStore'

const route = useRoute()
const router = useRouter()
const store = useInventoryStore()
const selectedRole = computed({
  get: () => store.currentRole,
  set: value => store.setRole(value),
})

watch(() => store.currentRole, () => {
  if (route.path === '/users' && !store.isAdmin) router.replace('/dashboard')
  if (route.path === '/approvals' && !(store.isAdmin || store.isManager)) router.replace('/dashboard')
  if (/^\/stock-(in|out)\/(create|[^/]+\/edit)$/.test(route.path) && !(store.isAdmin || store.isStaff)) router.replace('/dashboard')
})
</script>

<template>
  <header class="topbar">
    <div>
      <strong>{{ route.meta.title || 'SME StockSense' }}</strong>
      <span>Doanh nghiệp SME duy nhất</span>
    </div>
    <label class="role-picker">
      <span>Vai trò demo</span>
      <select v-model="selectedRole" class="select">
        <option v-for="role in roles" :key="role">{{ role }}</option>
      </select>
    </label>
  </header>
</template>

<style scoped>
.topbar { height: 64px; position: sticky; top: 0; z-index: 10; background: rgba(243, 246, 250, .92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.topbar strong { display: block; font-size: 16px; }
.topbar span { color: var(--muted); font-size: 13px; }
.role-picker { display: flex; align-items: center; gap: 8px; }
.role-picker .select { width: 180px; min-height: 36px; padding-block: 7px; }
@media (max-width: 720px) { .topbar { align-items: flex-start; height: auto; flex-direction: column; padding: 12px 16px; } }
</style>
