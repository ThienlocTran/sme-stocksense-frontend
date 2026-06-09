<template>
  <v-dialog 
    v-model="isOpen" 
    max-width="600" 
    persistent
    class="rounded-2xl"
  >
    <v-card class="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
      <!-- Title Bar -->
      <v-card-title class="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400">
            <i class="mdi" :class="isEdit ? 'mdi-pencil-outline' : 'mdi-plus-circle-outline'"></i>
          </div>
          <span class="text-lg font-bold text-slate-800 dark:text-white">
            {{ isEdit ? 'Cập nhật đối tác' : 'Thêm đối tác mới' }}
          </span>
        </div>
        <v-btn
          icon
          variant="text"
          density="comfortable"
          color="slate-500"
          @click="closeForm"
        >
          <i class="mdi mdi-close text-xl"></i>
        </v-btn>
      </v-card-title>

      <!-- Form Content -->
      <v-card-text class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        <!-- Error alert if any -->
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          closable
          class="rounded-xl mb-4"
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>

        <form @submit.prevent="submitForm" class="space-y-4">
          <!-- Tên đối tác (Required) -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên đối tác <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.tenDoiTac"
              type="text"
              placeholder="Nhập tên đối tác (Ví dụ: Công ty TNHH Song Hân)"
              class="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-slate-100"
              :class="errors.tenDoiTac ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-violet-500'"
              @input="clearError('tenDoiTac')"
            />
            <span v-if="errors.tenDoiTac" class="text-xs text-rose-500 mt-1 block">
              {{ errors.tenDoiTac }}
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Loại đối tác (Required) -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Loại đối tác <span class="text-rose-500">*</span>
              </label>
              <!-- Ghi chú ngắn: loại đối tác chỉ nhận 3 giá trị theo rule backend (NHA_CUNG_CAP, KHACH_HANG, CA_HAI) -->
              <select
                v-model="form.loaiDoiTac"
                class="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-slate-100"
                :class="errors.loaiDoiTac ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-violet-500'"
                @change="clearError('loaiDoiTac')"
              >
                <option value="" disabled>-- Chọn loại đối tác --</option>
                <option value="NHA_CUNG_CAP">Nhà cung cấp (NHA_CUNG_CAP)</option>
                <option value="KHACH_HANG">Khách hàng (KHACH_HANG)</option>
                <option value="CA_HAI">Cả hai (CA_HAI)</option>
              </select>
              <span v-if="errors.loaiDoiTac" class="text-xs text-rose-500 mt-1 block">
                {{ errors.loaiDoiTac }}
              </span>
            </div>

            <!-- Trạng thái hoạt động -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Trạng thái <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="form.trangThai"
                class="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-slate-100 focus:border-violet-500"
              >
                <option value="HOAT_DONG">Đang hoạt động</option>
                <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Người liên hệ -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Người liên hệ
              </label>
              <input
                v-model="form.nguoiLienHe"
                type="text"
                placeholder="Nhập tên người đại diện liên hệ"
                class="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-slate-100 focus:border-violet-500"
              />
            </div>

            <!-- Số điện thoại -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Số điện thoại
              </label>
              <input
                v-model="form.soDienThoai"
                type="text"
                placeholder="Ví dụ: 0912345678"
                class="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-slate-100 focus:border-violet-500"
              />
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email
            </label>
            <input
              v-model="form.email"
              type="text"
              placeholder="nhanvien@doitac.com"
              class="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-slate-100"
              :class="errors.email ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-violet-500'"
              @input="clearError('email')"
            />
            <span v-if="errors.email" class="text-xs text-rose-500 mt-1 block">
              {{ errors.email }}
            </span>
          </div>

          <!-- Địa chỉ -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Địa chỉ
            </label>
            <textarea
              v-model="form.diaChi"
              rows="3"
              placeholder="Nhập địa chỉ trụ sở/kho của đối tác"
              class="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-slate-100 focus:border-violet-500 resize-none"
            ></textarea>
          </div>
        </form>
      </v-card-text>

      <!-- Actions Footer -->
      <v-card-actions class="p-6 border-t border-slate-100 dark:border-slate-800 justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <v-btn
          variant="outlined"
          rounded="xl"
          class="text-none font-semibold border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
          @click="closeForm"
          :disabled="submitting"
        >
          Hủy bỏ
        </v-btn>
        <v-btn
          color="primary"
          rounded="xl"
          class="text-none font-semibold px-6 bg-violet-600 border-none shadow-md"
          @click="submitForm"
          :loading="submitting"
        >
          Lưu thông tin
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  partner: {
    type: Object,
    default: null
  },
  mockMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])
const authStore = useAuthStore()

// State
const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isEdit = computed(() => !!props.partner)
const submitting = ref(false)
const errorMessage = ref('')

const form = ref({
  tenDoiTac: '',
  loaiDoiTac: '',
  nguoiLienHe: '',
  soDienThoai: '',
  email: '',
  diaChi: '',
  trangThai: 'HOAT_DONG'
})

const errors = ref({
  tenDoiTac: '',
  loaiDoiTac: '',
  email: ''
})

// Đồng bộ hóa dữ liệu form khi mở hoặc chỉnh sửa đối tác
watch(() => props.modelValue, (open) => {
  if (open) {
    resetValidation()
    if (props.partner) {
      form.value = {
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
    tenDoiTac: '',
    loaiDoiTac: '',
    email: ''
  }
}

// Kiểm tra validate client-side trước khi gửi
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

// Gửi form lưu dữ liệu
const submitForm = async () => {
  if (!validateForm()) return

  submitting.value = true
  errorMessage.value = ''

  try {
    if (props.mockMode) {
      // Giả lập lưu thành công khi hoạt động ở mock mode
      await new Promise(resolve => setTimeout(resolve, 800))
      const savedObj = {
        ...form.value,
        id: isEdit.value ? props.partner.id : Date.now(),
        maDoiTac: isEdit.value ? props.partner.maDoiTac : 'DT-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      }
      emit('saved', savedObj)
      closeForm()
    } else {
      // Gọi API thật
      const config = {}
      if (authStore.token) {
        config.headers = { Authorization: `Bearer ${authStore.token}` }
      }

      let response
      if (isEdit.value) {
        response = await axios.put(`http://localhost:8080/api/partners/${props.partner.id}`, form.value, config)
      } else {
        // Create request có maDoiTac tự sinh, ta không cần truyền maDoiTac nếu form không nhập (để backend sinh)
        response = await axios.post('http://localhost:8080/api/partners', form.value, config)
      }

      emit('saved', response.data)
      closeForm()
    }
  } catch (error) {
    console.error('Lỗi khi lưu đối tác:', error)
    if (error.response) {
      const status = error.response.status
      if (status === 400 && error.response.data && error.response.data.errors) {
        // Ánh xạ lỗi validate từ Spring Boot backend
        const backendErrors = error.response.data.errors
        Object.keys(backendErrors).forEach(field => {
          if (field in errors.value) {
            errors.value[field] = backendErrors[field]
          } else {
            errorMessage.value = backendErrors[field]
          }
        })
      } else if (status === 403) {
        errorMessage.value = 'Không có quyền thực hiện thao tác này.'
      } else if (error.response.data && error.response.data.message) {
        errorMessage.value = error.response.data.message
      } else {
        errorMessage.value = 'Đã xảy ra lỗi không xác định từ phía máy chủ.'
      }
    } else {
      errorMessage.value = 'Không thể kết nối đến máy chủ. Đang tự động lưu giả lập cục bộ...'
      // Tự động chuyển đổi lưu giả lập nếu máy chủ sập giữa chừng
      setTimeout(() => {
        const savedObj = {
          ...form.value,
          id: isEdit.value ? props.partner.id : Date.now(),
          maDoiTac: isEdit.value ? props.partner.maDoiTac : 'DT-' + Math.random().toString(36).substring(2, 8).toUpperCase()
        }
        emit('saved', savedObj)
        closeForm()
      }, 1000)
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1em;
  padding-right: 2.5rem;
}
</style>
