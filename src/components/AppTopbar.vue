<script setup>
import { computed, reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { changeOwnPassword, clearAuth, formatRole } from '../services/authService'
import { useAuthStore } from '../stores/auth'
import { useLayoutStore } from '../stores/layout'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'

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

const { locale, t } = useI18n()
const currentLang = computed(() => locale.value)

const vuetifyTheme = useTheme()
const isDark = ref(localStorage.getItem('stocksense_theme') === 'dark')

function changeLang(lang) {
  locale.value = lang
  localStorage.setItem('stocksense_lang', lang)
  // Dispatch dynamic event to notify other components if necessary
  window.dispatchEvent(new CustomEvent('stocksense-lang-change', { detail: lang }))
}

function toggleTheme() {
  const newTheme = isDark.value ? 'light' : 'dark'
  isDark.value = !isDark.value
  localStorage.setItem('stocksense_theme', newTheme)
  vuetifyTheme.global.name.value = newTheme
  
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

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
    passwordSuccessMessage.value = data?.message || t('topbar.changePasswordSuccess')
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
    passwordErrors.currentPassword = t('topbar.currentPasswordRequired')
    isValid = false
  }

  if (!passwordForm.newPassword) {
    passwordErrors.newPassword = t('topbar.newPasswordRequired')
    isValid = false
  } else if (passwordForm.newPassword.length < 8) {
    passwordErrors.newPassword = t('topbar.newPasswordMinLength')
    isValid = false
  } else if (passwordForm.newPassword === passwordForm.currentPassword) {
    passwordErrors.newPassword = t('topbar.newPasswordMustBeDifferent')
    isValid = false
  }

  if (!passwordForm.confirmPassword) {
    passwordErrors.confirmPassword = t('topbar.confirmPasswordRequired')
    isValid = false
  } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
    passwordErrors.confirmPassword = t('topbar.confirmPasswordMismatch')
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
      <button class="mobile-menu-btn" type="button" @click="layoutStore.toggleMobileSidebar" :aria-label="t('common.close')">
        <i class="mdi mdi-menu"></i>
      </button>
      <div>
        <strong>{{ $t('routes.' + route.meta.title) || route.meta.title || 'SME StockSense' }}</strong>
        <span>{{ $t('topbar.subtitle') }}</span>
      </div>
    </div>
    <div class="topbar-actions">
      <div v-if="passwordSuccessMessage" class="password-success">
        <i class="mdi mdi-check-circle-outline"></i>
        <span>{{ passwordSuccessMessage }}</span>
      </div>

      <!-- Dark Mode Toggle (Scaled like the repo) -->
      <div class="theme-selector">
        <div 
          class="mode-button-container" 
          :class="isDark ? 'dark' : 'light'"
          @click="toggleTheme" 
          role="button" 
          tabindex="0"
          :title="isDark ? 'Switch to Light Mode' : 'Chuyển sang Chế độ tối'"
          @keydown.enter="toggleTheme"
          @keydown.space.prevent="toggleTheme"
        >
          <div class="mode-button">
            <!-- Glow layers -->
            <div class="layer">
              <div>
                <div></div>
              </div>
            </div>
            <!-- Sun / Moon indicator -->
            <div class="indicator">
              <div>
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
            <!-- Clouds (for day mode) -->
            <div class="cloud">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            <div class="cloud-background">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            <!-- Stars (for night mode) -->
            <div class="star">
              <div class="star-dot dot-1"></div>
              <div class="star-dot dot-2"></div>
              <div class="star-dot dot-3"></div>
              <div class="star-dot dot-4"></div>
              <div class="star-dot dot-5"></div>
              <div class="star-dot dot-6"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Language Selector Toggle -->
      <div class="lang-selector">
        <button 
          class="lang-btn" 
          type="button" 
          @click="changeLang(currentLang === 'vi' ? 'en' : 'vi')"
          :title="currentLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'"
        >
          <span class="lang-flag">{{ currentLang === 'vi' ? '🇻🇳' : '🇬🇧' }}</span>
          <span class="lang-code">{{ currentLang.toUpperCase() }}</span>
        </button>
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
              {{ $t('topbar.changePassword') }}
            </button>
            <button class="dropdown-item logout-item" type="button" :disabled="isLoggingOut" @click="triggerLogout">
              <i class="mdi mdi-logout"></i>
              {{ $t('topbar.logout') }}
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
            <h2 class="section-title">{{ $t('topbar.changePassword') }}</h2>
            <p class="modal-desc">{{ $t('topbar.updatingPassword') }}</p>
          </div>
          <button class="btn btn-icon" type="button" :disabled="isChangingPassword" :aria-label="$t('common.close')" @click="closePasswordModal">
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="modal-body grid">
          <div v-if="passwordErrorMessage" class="password-alert">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>{{ passwordErrorMessage }}</span>
          </div>

          <label class="field">
            <span>{{ $t('topbar.currentPassword') }}</span>
            <input v-model="passwordForm.currentPassword" class="input" type="password" :placeholder="$t('topbar.enterCurrentPassword')" :disabled="isChangingPassword" autocomplete="current-password" />
            <small v-if="passwordErrors.currentPassword" class="field-error">{{ passwordErrors.currentPassword }}</small>
          </label>

          <label class="field">
            <span>{{ $t('topbar.newPassword') }}</span>
            <input v-model="passwordForm.newPassword" class="input" type="password" :placeholder="$t('topbar.min8Chars')" :disabled="isChangingPassword" autocomplete="new-password" />
            <small v-if="passwordErrors.newPassword" class="field-error">{{ passwordErrors.newPassword }}</small>
          </label>

          <label class="field">
            <span>{{ $t('topbar.confirmPassword') }}</span>
            <input v-model="passwordForm.confirmPassword" class="input" type="password" :placeholder="$t('topbar.enterNewPasswordConfirm')" :disabled="isChangingPassword" autocomplete="new-password" />
            <small v-if="passwordErrors.confirmPassword" class="field-error">{{ passwordErrors.confirmPassword }}</small>
          </label>
        </div>

        <div class="modal-foot">
          <button class="btn" type="button" :disabled="isChangingPassword" @click="closePasswordModal">{{ $t('common.cancel') }}</button>
          <button class="btn btn-primary" type="submit" :disabled="isChangingPassword">
            <i v-if="isChangingPassword" class="mdi mdi-loading mdi-spin"></i>
            {{ isChangingPassword ? $t('topbar.saving') : $t('topbar.save') }}
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
  background: var(--color-topbar-bg); 
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
  background: var(--color-surface);
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

.theme-selector {
  margin-right: 8px;
  display: flex;
  align-items: center;
}
.mode-button-container {
  --toggle-width: 56px; 
  --toggle-height: 24px; 
  --layer-size: 56px;
  --indicator-size: 18px;
  --indicator-padding: 3px;
  
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.mode-button {
  width: var(--toggle-width);
  height: var(--toggle-height);
  position: relative;
  overflow: hidden;
  border-radius: calc(var(--toggle-height) / 2);
  box-shadow: inset 1px 1px 3px rgba(0,0,0,0.4), 0.5px 0.5px 1px rgba(255,255,255,0.2);
  cursor: pointer;
  transition: background-color 0.5s ease-in-out;
}

.mode-button:hover .layer {
  transform: scale(1.1);
}

.layer {
  position: absolute;
  z-index: 2;
  top: -110%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--layer-size);
  height: var(--layer-size);
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.08);
  transition: all 0.5s ease-in-out;
}

.layer div {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--layer-size) / 4 * 3);
  height: calc(var(--layer-size) / 4 * 3);
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.12);
}

.layer div div {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--layer-size) / 4 * 2);
  height: calc(var(--layer-size) / 4 * 2);
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.15);
}

.indicator {
  position: absolute;
  z-index: 4;
  top: var(--indicator-padding);
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--indicator-size);
  height: var(--indicator-size);
  border-radius: 50%;
  overflow: hidden;
  background-color: #fbbf24; /* Sun */
  box-shadow: 0 1px 3px rgba(0,0,0,0.3), inset -1px -1px 2px rgba(0,0,0,0.4), inset 1px 1px 2px rgba(255,255,255,0.4);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.indicator > div {
  position: absolute;
  z-index: 4;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--indicator-size);
  height: var(--indicator-size);
  border-radius: 50%;
  background-color: #cbd5e1; /* Moon */
  box-shadow: 0 1px 3px rgba(0,0,0,0.3), inset -1px -1px 2px rgba(0,0,0,0.4), inset 1px 1px 2px rgba(255,255,255,0.4);
  transition: all 0.5s ease-in-out;
}

/* Moon Craters */
.indicator div div:first-child {
  position: absolute;
  top: 2px;
  left: 4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #94a3b8;
  box-shadow: inset 0.5px 0.5px 1px rgba(0,0,0,0.3);
}

.indicator div div:nth-child(2) {
  position: absolute;
  top: 8px;
  left: 3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #94a3b8;
  box-shadow: inset 0.5px 0.5px 1px rgba(0,0,0,0.3);
}

.indicator div div:last-child {
  position: absolute;
  top: 10px;
  left: 11px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background-color: #94a3b8;
  box-shadow: inset 0.5px 0.5px 1px rgba(0,0,0,0.3);
}

/* Clouds styling */
.cloud, .cloud-background {
  position: absolute;
  z-index: 3;
  right: 0;
  transition: all 0.5s ease-in-out;
  width: 100%;
  height: 100%;
}

.cloud div, .cloud-background div {
  position: absolute;
  border-radius: 50%;
  background-color: #ffffff;
}

.cloud div:first-child { left: 24px; top: 12px; width: 16px; height: 16px; }
.cloud div:nth-child(2) { left: 32px; top: 8px; width: 18px; height: 18px; }
.cloud div:nth-child(3) { left: 40px; top: 10px; width: 14px; height: 14px; }
.cloud div:nth-child(4) { left: 16px; top: 14px; width: 12px; height: 12px; }
.cloud div:last-child { left: 8px; top: 16px; width: 10px; height: 10px; }

.cloud-background div {
  background-color: #93c5fd; /* Soft blue shadow cloud */
}
.cloud-background div:first-child { left: 22px; top: 10px; width: 16px; height: 16px; }
.cloud-background div:nth-child(2) { left: 30px; top: 6px; width: 18px; height: 18px; }
.cloud-background div:nth-child(3) { left: 38px; top: 8px; width: 14px; height: 14px; }
.cloud-background div:nth-child(4) { left: 14px; top: 12px; width: 12px; height: 12px; }
.cloud-background div:last-child { left: 6px; top: 14px; width: 10px; height: 10px; }

/* Stars styling */
.star {
  position: absolute;
  z-index: 1;
  width: 100%;
  height: 100%;
  transition: all 0.5s ease-in-out;
}

.star-dot {
  position: absolute;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 1px rgba(255, 255, 255, 0.8);
}
.dot-1 { left: 12px; top: 4px; width: 1.5px; height: 1.5px; }
.dot-2 { left: 18px; top: 14px; width: 1px; height: 1px; }
.dot-3 { left: 24px; top: 6px; width: 2px; height: 2px; }
.dot-4 { left: 28px; top: 16px; width: 1px; height: 1px; }
.dot-5 { left: 34px; top: 8px; width: 1.5px; height: 1.5px; }
.dot-6 { left: 8px; top: 12px; width: 1px; height: 1px; }

/* Light Mode active styles */
.light .indicator {
  left: var(--indicator-padding);
}
.light .indicator > div {
  left: 120%; /* Hide moon surface */
}
.light .layer {
  left: -20%;
}
.light .cloud {
  bottom: 0;
}
.light .cloud-background {
  bottom: 2px;
}
.light .mode-button {
  background-color: #3b82f6; /* Blue sky */
}
.light .star {
  top: -100%;
}

/* Dark Mode active styles */
.dark .indicator {
  left: calc(var(--toggle-width) - var(--indicator-padding) - var(--indicator-size));
}
.dark .indicator > div {
  left: 0; /* Show moon surface */
}
.dark .layer {
  left: 10%;
}
.dark .cloud {
  bottom: -100%;
}
.dark .cloud-background {
  bottom: -100%;
}
.dark .mode-button {
  background-color: #0f172a; /* Slate 900 night sky */
}
.dark .star {
  top: 0;
}

.lang-selector {
  margin-right: 8px;
  display: flex;
  align-items: center;
}
.lang-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  transition: all 150ms ease;
}
.lang-btn:hover {
  background: var(--color-bg);
  border-color: var(--color-border-strong);
}
.lang-flag {
  font-size: 16px;
  line-height: 1;
}
.lang-code {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-secondary);
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
