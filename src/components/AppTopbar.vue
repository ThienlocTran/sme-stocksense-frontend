<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { useInventoryStore, roles } from '../data/useInventoryStore'
import { clearAuth, getCurrentUser } from '../services/authService'

const route = useRoute()
const router = useRouter()
const store = useInventoryStore()
const currentUser = computed(() => getCurrentUser())
const isLoggingOut = computed(() => route.path === '/login')
const selectedRole = computed({
  get: () => store.currentRole,
  set: value => store.setRole(value),
})

function logout() {
  if (isLoggingOut.value) return
  clearAuth()
  router.replace('/login')
}

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
    <div class="topbar-actions">
      <div v-if="currentUser" class="user-chip">
        <strong>{{ currentUser.fullName }}</strong>
        <span>{{ currentUser.role }}</span>
      </div>
      <label class="role-picker">
        <span>Vai trò demo</span>
        <select v-model="selectedRole" class="select">
          <option v-for="role in roles" :key="role">{{ role }}</option>
        </select>
      </label>
      <button class="btn btn-sm" type="button" :disabled="isLoggingOut" @click="logout">
        <i class="mdi mdi-logout"></i>
        Đăng xuất
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar { height: 64px; position: sticky; top: 0; z-index: 10; background: rgba(243, 246, 250, .92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.topbar strong { display: block; font-size: 16px; }
.topbar span { color: var(--muted); font-size: 13px; }
.topbar-actions { display: flex; align-items: center; gap: 10px; }
.user-chip { min-width: 150px; }
.user-chip strong { font-size: 14px; line-height: 18px; }
.user-chip span { display: block; line-height: 18px; }
.role-picker { display: flex; align-items: center; gap: 8px; }
.role-picker .select { width: 180px; min-height: 36px; padding-block: 7px; }
@media (max-width: 720px) { .topbar, .topbar-actions { align-items: flex-start; height: auto; flex-direction: column; } .topbar { padding: 12px 16px; } .topbar-actions { width: 100%; } }
</style>
