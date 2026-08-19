<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login as loginWithPassword } from '../services/authService'
import { useAuthStore } from '../stores/auth'
import { gsap } from 'gsap'
import StockSenseFullLogo from '../components/branding/StockSenseFullLogo.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const form = reactive({ email: '', password: '' })
const fieldErrors = reactive({ email: '', password: '' })
const generalError = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)
const showPassword = ref(false)

const isDev = import.meta.env.DEV
const showDevReplay = ref(false)

function triggerDevReplay() {
  if (typeof window !== 'undefined' && typeof window.__replayIntro === 'function') {
    window.__replayIntro()
  }
}

// Function to trigger signature running light sweep effect
function playTraceAnimation() {
  const traceLogo = document.querySelector('.trace-logo')
  const greenPath = document.querySelector('.trace-logo .running-light-path')
  const whitePath = document.querySelector('.trace-logo .running-light-path-white')
  if (traceLogo && greenPath && whitePath) {
    const traceLen = greenPath.getTotalLength()
    
    // Set up initial state: transparent trace layer and reset path offset to 0
    gsap.set(traceLogo, { opacity: 0 })
    gsap.set([greenPath, whitePath], {
      strokeDasharray: `${traceLen * 0.20} ${traceLen * 0.80}`,
      strokeDashoffset: 0
    })
    
    // Create GSAP timeline for coordinated sweep and fade
    const tl = gsap.timeline()
    
    // Fade in the trace layer quickly
    tl.to(traceLogo, {
      opacity: 1,
      duration: 0.15,
      ease: 'power1.out'
    }, 0)
    
    // Sweep the dash across the entire length of the logo contour
    tl.to([greenPath, whitePath], {
      strokeDashoffset: -traceLen,
      duration: 1.8,
      ease: 'power2.inOut'
    }, 0)
    
    // Fade out the trace layer at the end of the sweep to ensure a clean finish
    tl.to(traceLogo, {
      opacity: 0,
      duration: 0.3,
      ease: 'power1.in'
    }, 1.5) // Starts slightly before the 1.8s sweep ends
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    // If intro has already completed, run immediately
    const introPlayed = window.sessionStorage.getItem('stocksense-intro-played') === 'true'
    if (introPlayed) {
      setTimeout(playTraceAnimation, 400)
    } else {
      // Otherwise wait for the custom completion event from App.vue
      window.addEventListener('stocksense-intro-complete', () => {
        setTimeout(playTraceAnimation, 500)
      })
    }
    
    // Gate dev replay behind explicit debug flag (URL query parameter or localStorage)
    const urlParams = new URLSearchParams(window.location.search)
    const debugIntro = urlParams.get('debug_intro') === 'true'
    const debugIntroStorage = window.localStorage.getItem('stocksense-debug-intro') === 'true'
    showDevReplay.value = isDev && (debugIntro || debugIntroStorage)
  }
})

watch(() => form.email, () => {
  fieldErrors.email = ''
})

watch(() => form.password, () => {
  fieldErrors.password = ''
})

async function submitLogin() {
  if (isSubmitting.value) return

  clearMessages()

  let hasError = false
  if (!form.email.trim()) {
    fieldErrors.email = 'Vui lòng nhập email.'
    hasError = true
  }
  if (!form.password) {
    fieldErrors.password = 'Vui lòng nhập mật khẩu.'
    hasError = true
  }

  if (hasError) return

  isSubmitting.value = true

  try {
    const response = await loginWithPassword(form.email.trim(), form.password)
    authStore.syncFromStorage()
    successMessage.value = 'Đăng nhập thành công.'
    router.push(getPostLoginRoute(response.role))
  } catch (error) {
    if (error.errors && (error.errors.email || error.errors.password)) {
      fieldErrors.email = error.errors.email || ''
      fieldErrors.password = error.errors.password || ''
    } else {
      generalError.value = error.message
    }
  } finally {
    isSubmitting.value = false
  }
}

function clearMessages() {
  generalError.value = ''
  successMessage.value = ''
  fieldErrors.email = ''
  fieldErrors.password = ''
}

function getPostLoginRoute(role) {
  if (typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//')) {
    return route.query.redirect
  }

  const routesByRole = {
    ADMIN: '/dashboard',
    MANAGER: '/dashboard',
    EMPLOYEE: '/dashboard',
  }

  return routesByRole[role] || '/dashboard'
}
</script>

<template>
  <main class="login-page">
    <!-- Large wordmark above the form container, with absolute overlay trace -->
    <div class="login-brand-logo">
      <StockSenseFullLogo class="base-logo" />
      <StockSenseFullLogo class="trace-logo" :isTrace="true" />
    </div>
    <p class="brand-tagline">Quản lý tồn kho thông minh</p>

    <section class="login-panel card card-pad">
      <div class="login-head-static">
        <p class="login-subtitle">Đăng nhập hệ thống nội bộ</p>
      </div>

      <form class="login-form" @submit.prevent="submitLogin">
        <p v-if="generalError" class="form-alert error-alert">{{ generalError }}</p>
        <p v-if="successMessage" class="form-alert success-alert">{{ successMessage }}</p>

        <label class="field">
          <span>Email</span>
          <input
            v-model="form.email"
            class="input"
            :class="{ invalid: fieldErrors.email }"
            type="email"
            autocomplete="email"
            placeholder="admin@example.com"
            :disabled="isSubmitting"
          />
          <small v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</small>
        </label>

        <label class="field">
          <span>Mật khẩu</span>
          <div class="password-input-wrap">
            <input
              v-model="form.password"
              class="input password-input"
              :class="{ invalid: fieldErrors.password }"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Nhập mật khẩu"
              :disabled="isSubmitting"
            />
            <button
              class="password-toggle"
              type="button"
              :disabled="isSubmitting"
              :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              :title="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              @click="showPassword = !showPassword"
            >
              <i class="mdi" :class="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"></i>
            </button>
          </div>
          <small v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</small>
        </label>

        <button class="btn btn-primary login-submit" type="submit" :disabled="isSubmitting">
          <i class="mdi" :class="isSubmitting ? 'mdi-loading mdi-spin' : 'mdi-login'"></i>
          {{ isSubmitting ? 'Đang đăng nhập' : 'Đăng nhập' }}
        </button>
      </form>
    </section>
  </main>

  <!-- Dev Replay Control in bottom corner -->
  <button
    v-if="showDevReplay"
    type="button"
    class="dev-replay-trigger"
    @click="triggerDevReplay"
    title="Dev Replay: Chạy lại Intro"
    aria-label="Chạy lại Intro"
  >
    <i class="mdi mdi-replay"></i> Intro Replay
  </button>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* Nudge everything up */
  padding: 8dvh 24px 24px; /* Pull content up towards top half */
  background: var(--bg);
  position: relative;
}
.login-brand-logo {
  position: relative;
  width: min(490px, 90vw); /* Large full logo width */
  aspect-ratio: 1254 / 250; /* Precise aspect ratio of the cropped wordmark */
  margin-bottom: 12px; /* Reduced to leave room for the tagline */
  display: block;
  overflow: hidden;
}
.brand-tagline {
  margin: 0 0 28px 0;
  color: var(--color-text-secondary);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-align: center;
}
.login-brand-logo :deep(.svg-content) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: auto;
  transform: translateY(-39.872%); /* Shift upward to align text visual center: 500 / 1254 = 39.872% */
}
.base-logo {
  width: 100%;
  height: 100%;
}
.trace-logo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0; /* Guard against FOUC before animation starts */
}
.login-panel {
  width: min(420px, 100%);
  display: grid;
  gap: 24px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}
.login-head-static {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 8px;
  text-align: center;
}
.login-subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
}
.login-form { display: grid; gap: 16px; }
.login-submit { width: 100%; min-height: 42px; }
.login-submit:disabled { opacity: 0.72; cursor: not-allowed; }
.form-alert { margin: 0; padding: 10px 12px; border-radius: 8px; line-height: 20px; }
.error-alert { color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; }
.success-alert { color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; }
.field-error { color: var(--danger); font-weight: 600; line-height: 18px; }
.password-input-wrap { position: relative; }
.password-input { padding-right: 46px; }
.password-toggle { position: absolute; top: 50%; right: 8px; width: 34px; height: 34px; display: grid; place-items: center; transform: translateY(-50%); border: 0; border-radius: 8px; background: transparent; color: var(--muted); cursor: pointer; }
.password-toggle:hover { background: #f1f5f9; color: var(--text); }
.password-toggle:disabled { cursor: not-allowed; opacity: 0.55; }
.password-toggle i { font-size: 20px; line-height: 1; }
.input.invalid { border-color: var(--danger); }
.input:disabled { background: #f8fafc; color: var(--muted); }
.mdi-spin { animation: spin 0.8s linear infinite; }

/* Dev replay trigger styles */
.dev-replay-trigger {
  position: fixed;
  bottom: 16px;
  right: 16px;
  background: var(--color-brand);
  color: #fff;
  border: 0;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(23, 107, 91, 0.25);
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 1000;
  transition: background 150ms ease, transform 150ms ease;
}
.dev-replay-trigger:hover {
  background: var(--color-brand-hover);
  transform: translateY(-1px);
}
.dev-replay-trigger:active {
  transform: translateY(0);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
