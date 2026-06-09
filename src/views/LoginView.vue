<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login as loginWithPassword } from '../services/authService'

const router = useRouter()
const form = reactive({ email: '', password: '' })
const fieldErrors = reactive({ email: '', password: '' })
const generalError = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)

async function submitLogin() {
  if (isSubmitting.value) return

  clearMessages()
  isSubmitting.value = true

  try {
    await loginWithPassword(form.email.trim(), form.password)
    successMessage.value = 'Đăng nhập thành công.'
    router.push('/dashboard')
  } catch (error) {
    generalError.value = error.message
    fieldErrors.email = error.errors?.email || ''
    fieldErrors.password = error.errors?.password || ''
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
</script>

<template>
  <main class="login-page">
    <section class="login-panel card card-pad">
      <div class="login-head">
        <div class="brand-mark">SS</div>
        <div>
          <h1>SME StockSense</h1>
          <p>Đăng nhập hệ thống nội bộ</p>
        </div>
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
          <input
            v-model="form.password"
            class="input"
            :class="{ invalid: fieldErrors.password }"
            type="password"
            autocomplete="current-password"
            placeholder="Nhập mật khẩu"
            :disabled="isSubmitting"
          />
          <small v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</small>
        </label>

        <button class="btn btn-primary login-submit" type="submit" :disabled="isSubmitting">
          <i class="mdi" :class="isSubmitting ? 'mdi-loading mdi-spin' : 'mdi-login'"></i>
          {{ isSubmitting ? 'Đang đăng nhập' : 'Đăng nhập' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: var(--bg); }
.login-panel { width: min(420px, 100%); display: grid; gap: 24px; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08); }
.login-head { display: flex; gap: 14px; align-items: center; }
.brand-mark { width: 46px; height: 46px; border-radius: 8px; display: grid; place-items: center; background: var(--primary); color: #fff; font-weight: 800; letter-spacing: 0; }
.login-head h1 { margin: 0; font-size: 22px; line-height: 30px; letter-spacing: 0; }
.login-head p { margin: 2px 0 0; color: var(--muted); }
.login-form { display: grid; gap: 16px; }
.login-submit { width: 100%; min-height: 42px; }
.login-submit:disabled { opacity: 0.72; cursor: not-allowed; }
.form-alert { margin: 0; padding: 10px 12px; border-radius: 8px; line-height: 20px; }
.error-alert { color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; }
.success-alert { color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; }
.field-error { color: var(--danger); font-weight: 600; line-height: 18px; }
.input.invalid { border-color: var(--danger); }
.input:disabled { background: #f8fafc; color: var(--muted); }
.mdi-spin { animation: spin 0.8s linear infinite; }

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
