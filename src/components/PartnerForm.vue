<script setup>
import { ref, watch, computed } from 'vue'
import { createPartner, updatePartner } from '../services/partnerService'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  partner: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

// State
const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isEdit = computed(() => !!props.partner)
const submitting = ref(false)
const errorMessage = ref('')

const form = ref({
  maDoiTac: '',
  tenDoiTac: '',
  loaiDoiTac: '',
  nguoiLienHe: '',
  soDienThoai: '',
  email: '',
  diaChi: '',
  trangThai: 'HOAT_DONG'
})

const errors = ref({
  maDoiTac: '',
  tenDoiTac: '',
  loaiDoiTac: '',
  email: ''
})

// Sync form data when dialog opens
watch(() => props.modelValue, (open) => {
  if (open) {
    resetValidation()
    if (props.partner) {
      form.value = {
        maDoiTac: props.partner.maDoiTac || '',
        tenDoiTac: props.partner.tenDoiTac || '',
        loaiDoiTac: props.partner.loaiDoiTac || '',
        nguoiLienHe: props.partner.nguoiLienHe || '',
        soDienThoai: props.partner.soDienThoai || '',
        email: props.partner.email || '',
        diaChi: props.partner.diaChi || '',
        trangThai: props.partner.trangThai || 'HOAT_DONG'
      }
    } else {
      form.value = {
        maDoiTac: '',
        tenDoiTac: '',
        loaiDoiTac: '',
        nguoiLienHe: '',
        soDienThoai: '',
        email: '',
        diaChi: '',
        trangThai: 'HOAT_DONG'
      }
    }
  }
})

const clearError = (field) => {
  errors.value[field] = ''
}

const resetValidation = () => {
  errorMessage.value = ''
  errors.value = {
    maDoiTac: '',
    tenDoiTac: '',
    loaiDoiTac: '',
    email: ''
  }
}

// Client-side validation
const validateForm = () => {
  let isValid = true
  resetValidation()

  if (!form.value.tenDoiTac || !form.value.tenDoiTac.trim()) {
    errors.value.tenDoiTac = 'Tên đối tác không được để trống.'
    isValid = false
  }

  if (!form.value.loaiDoiTac) {
    errors.value.loaiDoiTac = 'Loại đối tác không được để trống.'
    isValid = false
  }

  if (form.value.email && form.value.email.trim()) {
    const emailPattern = /^[a-zA-Z0-9_+&*-]+(?:\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,7}$/
    if (!emailPattern.test(form.value.email.trim())) {
      errors.value.email = 'Email không đúng định dạng.'
      isValid = false
    }
  }

  return isValid
}

const closeForm = () => {
  isOpen.value = false
}

// Submit form data to service
const submitForm = async () => {
  if (!validateForm()) return

  submitting.value = true
  errorMessage.value = ''

  const payload = {
    tenDoiTac: form.value.tenDoiTac.trim(),
    loaiDoiTac: form.value.loaiDoiTac,
    nguoiLienHe: form.value.nguoiLienHe.trim() || null,
    soDienThoai: form.value.soDienThoai.trim() || null,
    email: form.value.email.trim() || null,
    diaChi: form.value.diaChi.trim() || null,
    trangThai: form.value.trangThai
  }

  // Include maDoiTac on create if provided
  if (!isEdit.value) {
    payload.maDoiTac = form.value.maDoiTac.trim() || null
  }

  try {
    let response
    if (isEdit.value) {
      response = await updatePartner(props.partner.id, payload)
    } else {
      response = await createPartner(payload)
    }

    emit('saved', response)
    closeForm()
  } catch (error) {
    console.error('Lỗi khi lưu đối tác:', error)
    if (error.errors) {
      const backendErrors = error.errors
      Object.keys(backendErrors).forEach(field => {
        if (field in errors.value) {
          errors.value[field] = backendErrors[field]
        } else {
          errorMessage.value = backendErrors[field]
        }
      })
    } else {
      errorMessage.value = error.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="closeForm">
    <div class="modal partner-modal">
      <form @submit.prevent="submitForm" class="partner-form">
        <div class="modal-head between">
          <div>
            <h2 class="section-title">{{ isEdit ? 'Cập nhật đối tác' : 'Thêm đối tác mới' }}</h2>
            <p class="modal-subtitle">
              {{ isEdit ? 'Cập nhật thông tin chi tiết của đối tác.' : 'Tạo đối tác mới với các thông tin cơ bản.' }}
            </p>
          </div>
          <button class="btn btn-icon" type="button" :disabled="submitting" aria-label="Đóng" @click="closeForm">
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="modal-body grid grid-2">
          <div v-if="errorMessage" class="partner-form-alert">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Tên đối tác (Required) -->
          <label class="field col-span-2">
            <span>Tên đối tác <span class="text-rose-500">*</span></span>
            <input
              v-model="form.tenDoiTac"
              type="text"
              placeholder="Nhập tên đối tác (Ví dụ: Công ty TNHH Song Hân)"
              class="input"
              :class="{ 'border-rose-500 focus:border-rose-500': errors.tenDoiTac }"
              :disabled="submitting"
              @input="clearError('tenDoiTac')"
            />
            <small v-if="errors.tenDoiTac" class="field-error">{{ errors.tenDoiTac }}</small>
          </label>

          <!-- Mã đối tác (Optional on Create, Readonly on Edit) -->
          <label class="field">
            <span>Mã đối tác</span>
            <input
              v-model="form.maDoiTac"
              type="text"
              placeholder="Tự động sinh nếu để trống"
              class="input"
              :class="{ 'border-rose-500 focus:border-rose-500': errors.maDoiTac }"
              :disabled="isEdit || submitting"
              @input="clearError('maDoiTac')"
            />
            <small v-if="errors.maDoiTac" class="field-error">{{ errors.maDoiTac }}</small>
          </label>

          <!-- Loại đối tác (Required) -->
          <label class="field">
            <span>Loại đối tác <span class="text-rose-500">*</span></span>
            <select
              v-model="form.loaiDoiTac"
              class="select"
              :class="{ 'border-rose-500 focus:border-rose-500': errors.loaiDoiTac }"
              :disabled="submitting"
              @change="clearError('loaiDoiTac')"
            >
              <option value="" disabled>-- Chọn loại đối tác --</option>
              <option value="NHA_CUNG_CAP">Nhà cung cấp</option>
              <option value="KHACH_HANG">Khách hàng</option>
              <option value="CA_HAI">Cả hai</option>
            </select>
            <small v-if="errors.loaiDoiTac" class="field-error">{{ errors.loaiDoiTac }}</small>
          </label>

          <!-- Người liên hệ -->
          <label class="field">
            <span>Người liên hệ</span>
            <input
              v-model="form.nguoiLienHe"
              type="text"
              placeholder="Người đại diện liên hệ"
              class="input"
              :disabled="submitting"
            />
          </label>

          <!-- Số điện thoại -->
          <label class="field">
            <span>Số điện thoại</span>
            <input
              v-model="form.soDienThoai"
              type="text"
              placeholder="Ví dụ: 0912345678"
              class="input"
              :disabled="submitting"
            />
          </label>

          <!-- Email -->
          <label class="field col-span-2">
            <span>Email</span>
            <input
              v-model="form.email"
              type="text"
              placeholder="nhanvien@doitac.com"
              class="input"
              :class="{ 'border-rose-500 focus:border-rose-500': errors.email }"
              :disabled="submitting"
              @input="clearError('email')"
            />
            <small v-if="errors.email" class="field-error">{{ errors.email }}</small>
          </label>

          <!-- Trạng thái -->
          <label class="field col-span-2">
            <span>Trạng thái <span class="text-rose-500">*</span></span>
            <select v-model="form.trangThai" class="select" :disabled="submitting">
              <option value="HOAT_DONG">Đang hoạt động</option>
              <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
            </select>
          </label>

          <!-- Địa chỉ -->
          <label class="field col-span-2">
            <span>Địa chỉ</span>
            <textarea
              v-model="form.diaChi"
              rows="2"
              placeholder="Địa chỉ trụ sở/kho đối tác"
              class="textarea"
              :disabled="submitting"
            ></textarea>
          </label>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" type="button" :disabled="submitting" @click="closeForm">Hủy bỏ</button>
          <button class="btn btn-primary" type="submit" :disabled="submitting">
            <i v-if="submitting" class="mdi mdi-loading mdi-spin"></i>
            {{ submitting ? 'Đang lưu' : 'Lưu thông tin' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.partner-modal {
  width: min(600px, 100%);
}
.partner-form {
  margin: 0;
}
.modal-subtitle {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.partner-form-alert {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-danger);
  background: var(--color-danger-soft);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
  font-weight: 600;
}
.field > span {
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 2px;
}
.field-error {
  color: var(--color-danger);
  font-weight: 600;
  font-size: 12px;
  margin-top: 4px;
}
.col-span-2 {
  grid-column: span 2 / span 2;
}
.mdi-spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 639px) {
  .col-span-2 {
    grid-column: span 1 / span 1;
  }
  .modal-body {
    grid-template-columns: 1fr;
  }
}
</style>
