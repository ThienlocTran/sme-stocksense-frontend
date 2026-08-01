<script setup>
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { getCurrentProfile } from '../services/profileService'
import { formatRole } from '../services/authService'

const authStore = useAuthStore()
const profile = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')

function getStatusLabel(status) {
  if (!status) return '—'
  return String(status).toUpperCase()
}

async function loadProfile() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const data = await getCurrentProfile()
    profile.value = data
  } catch (error) {
    errorMessage.value = error?.message || 'Không thể tải hồ sơ.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <section class="page-stack">
    <header class="page-header">
      <div>
        <h1 class="page-title">Hồ sơ</h1>
        <p class="page-desc">Xem thông tin tài khoản và vai trò đang hoạt động.</p>
      </div>
    </header>

    <div v-if="isLoading" class="card card-pad state-card" aria-live="polite">
      <div class="state-icon"><i class="mdi mdi-loading mdi-spin"></i></div>
      <h2 class="section-title">Đang tải hồ sơ</h2>
      <p class="muted">Đang lấy dữ liệu từ hệ thống...</p>
    </div>

    <div v-else-if="errorMessage" class="card card-pad state-card state-card-error">
      <div class="state-icon"><i class="mdi mdi-alert-circle-outline"></i></div>
      <h2 class="section-title">Không thể tải hồ sơ</h2>
      <p class="muted">{{ errorMessage }}</p>
      <button class="btn btn-primary" type="button" @click="loadProfile">Thử lại</button>
    </div>

    <div v-else-if="!profile" class="card card-pad state-card">
      <div class="state-icon"><i class="mdi mdi-account-outline"></i></div>
      <h2 class="section-title">Chưa có dữ liệu hồ sơ</h2>
      <p class="muted">Hệ thống chưa trả về thông tin profile cho tài khoản này.</p>
    </div>

    <div v-else class="profile-shell">
      <div class="card card-pad profile-hero">
        <div class="avatar-wrap">
          <div class="avatar">
            <i class="mdi mdi-account"></i>
          </div>
          <div>
            <h2 class="section-title">{{ profile.fullName || '—' }}</h2>
            <p class="muted">{{ profile.email || 'Chưa có email' }}</p>
          </div>
        </div>
        <div class="hero-badge">
          <span class="badge-chip">{{ formatRole(profile.role || authStore.currentRole) }}</span>
        </div>
      </div>

      <div class="card card-pad">
        <div class="section-head">
          <h3 class="section-title">Thông tin tài khoản</h3>
          <p class="muted">Chỉ hiển thị dữ liệu từ hệ thống và không cho chỉnh sửa trực tiếp.</p>
        </div>

        <div class="profile-grid">
          <div class="info-item">
            <span class="info-label">Họ và tên</span>
            <strong>{{ profile.fullName || '—' }}</strong>
          </div>
          <div class="info-item">
            <span class="info-label">Email</span>
            <strong>{{ profile.email || '—' }}</strong>
          </div>
          <div class="info-item">
            <span class="info-label">Vai trò</span>
            <strong>{{ formatRole(profile.role || authStore.currentRole) || '—' }}</strong>
          </div>
          <div class="info-item">
            <span class="info-label">Trạng thái</span>
            <strong>{{ getStatusLabel(profile.status) }}</strong>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-stack { display: grid; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.profile-shell { display: grid; gap: 20px; }
.profile-hero { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.avatar-wrap { display: flex; align-items: center; gap: 16px; }
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--primary);
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  font-size: 26px;
}
.badge-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: #eff6ff;
  color: var(--primary);
  font-weight: 700;
  white-space: nowrap;
}
.section-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.info-item {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.info-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
.state-card {
  min-height: 260px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 8px;
}
.state-card-error { border-color: #fecaca; background: #fff7f7; }
.state-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #eff6ff;
  color: var(--primary);
  font-size: 24px;
}
.state-card-error .state-icon { background: #fef2f2; color: var(--danger); }
.mdi-spin { animation: spin 0.8s linear infinite; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .page-header, .profile-hero { flex-direction: column; align-items: flex-start; }
  .profile-grid { grid-template-columns: 1fr; }
}
</style>
