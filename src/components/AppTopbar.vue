<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { changeOwnPassword, clearAuth, formatRole, getCurrentUser } from '../services/authService'

const route = useRoute()
const router = useRouter()
const currentUser = computed(() => getCurrentUser())
const currentUserRole = computed(() => formatRole(currentUser.value?.role))
const isLoggingOut = computed(() => route.path === '/login')
const isPasswordModalOpen = ref(false)
const isChangingPassword = ref(false)
const passwordErrorMessage = ref('')
const passwordSuccessMessage = ref('')
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordErrors = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

function logout() {
  if (isLoggingOut.value) return
  passwordSuccessMessage.value = ''
  clearPasswordForm()
  clearAuth()
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
    <div>
      <strong>{{ route.meta.title || 'SME StockSense' }}</strong>
      <span>Doanh nghiệp SME duy nhất</span>
    </div>
    <div class="topbar-actions">
      <div v-if="passwordSuccessMessage" class="password-success">
        <i class="mdi mdi-check-circle-outline"></i>
        <span>{{ passwordSuccessMessage }}</span>
      </div>
      <div v-if="currentUser" class="user-chip">
        <strong>{{ currentUser.fullName }}</strong>
        <span>{{ currentUserRole }}</span>
      </div>
      <button v-if="currentUser" class="btn btn-sm" type="button" :disabled="isLoggingOut" @click="openPasswordModal">
        <i class="mdi mdi-lock-reset"></i>
        Đổi mật khẩu
      </button>
      <button class="btn btn-sm" type="button" :disabled="isLoggingOut" @click="logout">
        <i class="mdi mdi-logout"></i>
        Đăng xuất
      </button>
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
.topbar { height: 64px; position: sticky; top: 0; z-index: 10; background: rgba(243, 246, 250, .92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.topbar strong { display: block; font-size: 16px; }
.topbar span { color: var(--muted); font-size: 13px; }
.topbar-actions { display: flex; align-items: center; gap: 10px; }
.password-success { display: inline-flex; align-items: center; gap: 6px; color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 7px 10px; font-size: 13px; font-weight: 700; }
.user-chip { min-width: 150px; }
.user-chip strong { font-size: 14px; line-height: 18px; }
.user-chip span { display: block; line-height: 18px; }
.password-modal { width: min(520px, 100%); }
.password-form { margin: 0; }
.modal-desc { margin: 4px 0 0; color: var(--muted); }
.password-alert { display: flex; align-items: center; gap: 10px; color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; font-weight: 600; }
.field > span { color: #374151; font-weight: 600; }
.field-error { color: var(--danger); font-weight: 600; line-height: 18px; }
.mdi-spin { animation: spin 0.8s linear infinite; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .topbar, .topbar-actions { align-items: flex-start; height: auto; flex-direction: column; }
  .topbar { padding: 12px 16px; }
  .topbar-actions, .topbar-actions .btn, .password-success { width: 100%; }
  .modal-foot { flex-direction: column-reverse; }
  .modal-foot .btn { width: 100%; }
}
</style>
