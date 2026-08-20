<script setup>
import { computed, reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { changeOwnPassword, clearAuth, formatRole } from '../services/authService'
import { useAuthStore } from '../stores/auth'
import { useLayoutStore } from '../stores/layout'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const layoutStore = useLayoutStore()
const currentUser = computed(() => authStore.currentUser)
const currentUserRole = computed(() => formatRole(authStore.currentRole))
const isLoggingOut = computed(() => route.path === '/login')
const isPasswordModalOpen = ref(false)
const isChangingPassword = ref(false)
const passwordErrorMessage = ref('')
const passwordSuccessMessage = ref('')
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordErrors = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

const isUserMenuOpen = ref(false)

function handleDocumentClick(event) {
  const wrapper = document.querySelector('.user-menu-wrapper')
  if (wrapper && !wrapper.contains(event.target)) {
    isUserMenuOpen.value = false
  }
}

function triggerChangePassword() {
  isUserMenuOpen.value = false
  openPasswordModal()
}

function triggerLogout() {
  isUserMenuOpen.value = false
  logout()
}

onMounted(() => {
  window.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleDocumentClick)
})

function logout() {
  if (isLoggingOut.value) return
  passwordSuccessMessage.value = ''
  clearPasswordForm()
  clearAuth()
  authStore.syncFromStorage()
  router.replace('/login')
}

function openPasswordModal() {
  passwordSuccessMessage.value = ''
  clearPasswordFeedback()
  isPasswordModalOpen.value = true
}

function closePasswordModal() {
  if (isChangingPassword.value) return
  isPasswordModalOpen.value = false
  clearPasswordForm()
}

async function submitChangePassword() {
  if (!validatePasswordForm()) return

  isChangingPassword.value = true
  passwordErrorMessage.value = ''

  try {
    const data = await changeOwnPassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword,
    })
    passwordSuccessMessage.value = data?.message || 'Đổi mật khẩu thành công.'
    isPasswordModalOpen.value = false
    clearPasswordForm()
  } catch (error) {
    if (error.status === 401) {
      isPasswordModalOpen.value = false
      clearPasswordForm()
      router.replace('/login')
      return
    }

    passwordErrorMessage.value = error.message
    applyPasswordBackendErrors(error.errors)
  } finally {
    isChangingPassword.value = false
  }
}

function validatePasswordForm() {
  clearPasswordFeedback()
  let isValid = true

  if (!passwordForm.currentPassword) {
    passwordErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
    isValid = false
  }

  if (!passwordForm.newPassword) {
    passwordErrors.newPassword = 'Vui lòng nhập mật khẩu mới.'
    isValid = false
  } else if (passwordForm.newPassword.length < 8) {
    passwordErrors.newPassword = 'Mật khẩu mới tối thiểu 8 ký tự.'
    isValid = false
  } else if (passwordForm.newPassword === passwordForm.currentPassword) {
    passwordErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.'
    isValid = false
  }

  if (!passwordForm.confirmPassword) {
    passwordErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.'
    isValid = false
  } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
    passwordErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    isValid = false
  }

  return isValid
}

function clearPasswordFeedback() {
  passwordErrorMessage.value = ''
  passwordErrors.currentPassword = ''
  passwordErrors.newPassword = ''
  passwordErrors.confirmPassword = ''
}

function clearPasswordForm() {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  clearPasswordFeedback()
}

function applyPasswordBackendErrors(errors = {}) {
  passwordErrors.currentPassword = errors?.currentPassword || ''
  passwordErrors.newPassword = errors?.newPassword || errors?.password || ''
  passwordErrors.confirmPassword = errors?.confirmPassword || ''
}
</script>

<template>
  <header class="topbar">
    <div style="display: flex; align-items: center; gap: 12px;">
      <button class="mobile-menu-btn" type="button" @click="layoutStore.toggleMobileSidebar" aria-label="Menu">
        <i class="mdi mdi-menu"></i>
      </button>
      <div>
        <strong>{{ route.meta.title || 'SME StockSense' }}</strong>
        <span>Doanh nghiệp SME duy nhất</span>
      </div>
    </div>
    <div class="topbar-actions">
      <div v-if="passwordSuccessMessage" class="password-success">
        <i class="mdi mdi-check-circle-outline"></i>
        <span>{{ passwordSuccessMessage }}</span>
      </div>

      <!-- Clickable User Profile Toggle with Dropdown -->
      <div v-if="currentUser" class="user-menu-wrapper">
        <button 
          class="user-menu-trigger" 
          type="button" 
          @click.stop="isUserMenuOpen = !isUserMenuOpen"
          aria-label="User Menu"
        >
          <div 
            class="user-avatar-circle"
            :style="currentUser.avatarUrl && !currentUser.avatarUrl.includes('/null') ? { backgroundImage: `url(${currentUser.avatarUrl})` } : {}"
          >
            <i v-if="!currentUser.avatarUrl || currentUser.avatarUrl.includes('/null')" class="mdi mdi-account"></i>
          </div>
          <span class="user-trigger-name">{{ currentUser.fullName }}</span>
          <i class="mdi mdi-chevron-down trigger-chevron" :class="{ 'chevron-rotated': isUserMenuOpen }"></i>
        </button>

        <!-- Floating Dropdown Menu -->
        <transition name="dropdown-fade">
          <div v-if="isUserMenuOpen" class="user-dropdown-menu">
            <div class="dropdown-header">
              <strong>{{ currentUser.fullName }}</strong>
              <span class="role-badge">{{ currentUserRole }}</span>
            </div>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" type="button" :disabled="isLoggingOut" @click="triggerChangePassword">
              <i class="mdi mdi-lock-reset"></i>
              Đổi mật khẩu
            </button>
            <button class="dropdown-item logout-item" type="button" :disabled="isLoggingOut" @click="triggerLogout">
              <i class="mdi mdi-logout"></i>
              Đăng xuất
            </button>
          </div>
        </transition>
      </div>
    </div>
  </header>

  <div v-if="isPasswordModalOpen" class="modal-backdrop">
    <div class="modal password-modal">
      <form class="password-form" @submit.prevent="submitChangePassword">
        <div class="modal-head between">
          <div>
            <h2 class="section-title">Đổi mật khẩu</h2>
            <p class="modal-desc">Cập nhật mật khẩu cho tài khoản hiện tại.</p>
          </div>
          <button class="btn btn-icon" type="button" :disabled="isChangingPassword" aria-label="Đóng" @click="closePasswordModal">
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="modal-body grid">
          <div v-if="passwordErrorMessage" class="password-alert">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>{{ passwordErrorMessage }}</span>
          </div>

          <label class="field">
            <span>Mật khẩu hiện tại</span>
            <input v-model="passwordForm.currentPassword" class="input" type="password" placeholder="Nhập mật khẩu hiện tại" :disabled="isChangingPassword" autocomplete="current-password" />
            <small v-if="passwordErrors.currentPassword" class="field-error">{{ passwordErrors.currentPassword }}</small>
          </label>

          <label class="field">
            <span>Mật khẩu mới</span>
            <input v-model="passwordForm.newPassword" class="input" type="password" placeholder="Tối thiểu 8 ký tự" :disabled="isChangingPassword" autocomplete="new-password" />
            <small v-if="passwordErrors.newPassword" class="field-error">{{ passwordErrors.newPassword }}</small>
          </label>

          <label class="field">
            <span>Xác nhận mật khẩu mới</span>
            <input v-model="passwordForm.confirmPassword" class="input" type="password" placeholder="Nhập lại mật khẩu mới" :disabled="isChangingPassword" autocomplete="new-password" />
            <small v-if="passwordErrors.confirmPassword" class="field-error">{{ passwordErrors.confirmPassword }}</small>
          </label>
        </div>

        <div class="modal-foot">
          <button class="btn" type="button" :disabled="isChangingPassword" @click="closePasswordModal">Hủy</button>
          <button class="btn btn-primary" type="submit" :disabled="isChangingPassword">
            <i v-if="isChangingPassword" class="mdi mdi-loading mdi-spin"></i>
            {{ isChangingPassword ? 'Đang lưu' : 'Lưu' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.topbar { 
  height: 64px; 
  position: sticky; 
  top: 0; 
  z-index: 10; 
  background: rgba(255, 255, 255, 0.92); 
  backdrop-filter: blur(10px); 
  border-bottom: 1px solid var(--color-border); 
  padding: 12px 24px; 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  gap: 16px; 
}
.topbar strong { display: block; font-size: 16px; color: var(--color-text-primary); }
.topbar span { color: var(--color-text-secondary); font-size: 13px; }
.topbar-actions { display: flex; align-items: center; gap: 10px; }
.password-success { 
  display: inline-flex; 
  align-items: center; 
  gap: 6px; 
  color: var(--color-success); 
  background: var(--color-primary-soft); 
  border: 1px solid rgba(22, 130, 93, 0.16); 
  border-radius: 8px; 
  padding: 7px 10px; 
  font-size: 13px; 
  font-weight: 700; 
}
.password-modal { width: min(520px, 100%); }
.password-form { margin: 0; }
.modal-desc { margin: 4px 0 0; color: var(--color-text-secondary); }
.password-alert { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  color: var(--color-danger); 
  background: #fef2f2; 
  border: 1px solid rgba(194, 65, 59, 0.16); 
  border-radius: 8px; 
  padding: 10px 12px; 
  font-weight: 600; 
}
.field > span { color: var(--color-text-primary); font-weight: 600; }
.field-error { color: var(--color-danger); font-weight: 600; line-height: 18px; }
.mdi-spin { animation: spin 0.8s linear infinite; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* User Menu & Dropdown Styles */
.user-menu-wrapper {
  position: relative;
}
.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 4px 12px 4px 4px;
  cursor: pointer;
  transition: all 150ms ease;
}
.user-menu-trigger:hover {
  background: var(--color-bg);
  border-color: var(--color-border-strong);
}
.user-avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--color-border-strong);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--color-text-secondary);
}
.user-avatar-circle i {
  font-size: 18px;
}
.user-trigger-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text-primary);
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.trigger-chevron {
  font-size: 16px;
  color: var(--color-text-secondary);
  transition: transform 150ms ease;
}
.chevron-rotated {
  transform: rotate(180deg);
}

.user-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 220px;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  padding: 8px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-header {
  padding: 8px 12px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dropdown-header strong {
  font-size: 14px;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dropdown-header .role-badge {
  font-size: 11px;
  color: var(--color-brand);
  background: var(--color-brand-soft);
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
  font-weight: 700;
}

.dropdown-divider {
  height: 1px;
  background: var(--color-border);
  margin: 6px 4px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 150ms ease;
}
.dropdown-item i {
  font-size: 16px;
  color: var(--color-text-secondary);
}
.dropdown-item:hover {
  background: var(--color-bg);
}
.logout-item:hover {
  background: #fef2f2;
  color: var(--color-danger);
}
.logout-item:hover i {
  color: var(--color-danger);
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 720px) {
  .topbar {
    padding: 12px 16px;
  }
  .user-trigger-name {
    display: none;
  }
  .user-menu-trigger {
    padding: 4px;
  }
}
</style>
