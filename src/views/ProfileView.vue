<script setup>
import { onMounted, ref, reactive } from "vue";
import { useAuthStore } from "../stores/auth";
import { getCurrentProfile, updateProfile, uploadAvatar } from "../services/profileService";
import { formatRole } from "../services/authService";
import { Cropper, CircleStencil } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';

const authStore = useAuthStore();
const profile = ref(null);
const isLoading = ref(true);
const errorMessage = ref("");
const isEditing = ref(false);
const isSaving = ref(false);
const isUploading = ref(false);
const showCropper = ref(false);
const imageToCrop = ref("");
const cropperRef = ref(null);
const pendingAvatarFile = ref(null);
const previewAvatarUrl = ref("");

const formData = reactive({
  fullName: "",
  phone: "",
  gender: "",
  dateOfBirth: ""
});

const fileInputRef = ref(null);

function getStatusLabel(status) {
  if (!status) return "—";
  return String(status).toUpperCase();
}

function getGenderLabel(gender) {
  if (gender === 'MALE') return "Nam";
  if (gender === 'FEMALE') return "Nữ";
  if (gender === 'OTHER') return "Khác";
  return "—";
}

async function loadProfile() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const data = await getCurrentProfile();
    profile.value = data;
    resetForm();
  } catch (error) {
    errorMessage.value = error?.message || "Không thể tải hồ sơ.";
  } finally {
    isLoading.value = false;
  }
}

function resetForm() {
  if (profile.value) {
    formData.fullName = profile.value.fullName || "";
    formData.phone = profile.value.phone || "";
    formData.gender = profile.value.gender || "";
    formData.dateOfBirth = profile.value.dateOfBirth || "";
  }
}

function toggleEdit() {
  if (isEditing.value) {
    resetForm();
    pendingAvatarFile.value = null;
    previewAvatarUrl.value = "";
  }
  isEditing.value = !isEditing.value;
}

async function saveProfile() {
  isSaving.value = true;
  try {
    let updatedProfile = await updateProfile(formData);
    
    if (pendingAvatarFile.value) {
      updatedProfile = await uploadAvatar(pendingAvatarFile.value);
    }
    
    profile.value = updatedProfile;
    authStore.updateUser({ 
      fullName: updatedProfile.fullName, 
      phone: updatedProfile.phone,
      avatarUrl: updatedProfile.avatarUrl
    });
    
    isEditing.value = false;
    pendingAvatarFile.value = null;
    previewAvatarUrl.value = "";
  } catch (error) {
    alert(error?.message || "Lỗi khi cập nhật hồ sơ");
  } finally {
    isSaving.value = false;
  }
}

function triggerFileInput() {
  if (fileInputRef.value) fileInputRef.value.click();
}

async function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert("Kích thước file không được vượt quá 5MB.");
    event.target.value = "";
    return;
  }

  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    alert("Chỉ chấp nhận ảnh định dạng JPEG, PNG, WEBP.");
    event.target.value = "";
    return;
  }

  imageToCrop.value = URL.createObjectURL(file);
  showCropper.value = true;
  event.target.value = "";
}

function cancelCrop() {
  showCropper.value = false;
  imageToCrop.value = "";
}

async function applyCrop() {
  if (!cropperRef.value) return;
  
  // Giảm kích thước ảnh xuống tối đa 512x512 để upload cực nhanh
  const { canvas } = cropperRef.value.getResult({
    width: 512,
    height: 512
  });
  
  if (canvas) {
    canvas.toBlob((blob) => {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      pendingAvatarFile.value = file;
      previewAvatarUrl.value = URL.createObjectURL(file);
      showCropper.value = false;
      imageToCrop.value = "";
    }, "image/jpeg", 0.85);
  }
}

onMounted(() => {
  loadProfile();
});
</script>

<template>
  <main class="w-full max-w-4xl mx-auto py-12 px-6">
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-zinc-200">
      <div>
        <h1 class="text-3xl font-medium tracking-tight text-zinc-900">Hồ sơ cá nhân</h1>
        <p class="mt-2 text-zinc-500">Xem và quản lý thông tin định danh nội bộ.</p>
      </div>
      <div class="flex items-center gap-3">
        <button 
          v-if="profile && !isEditing" 
          class="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors"
          @click="toggleEdit"
        >
          Sửa hồ sơ
        </button>
        <template v-if="isEditing">
          <button 
            class="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-md transition-colors"
            @click="toggleEdit"
          >
            Hủy
          </button>
          <button 
            class="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
            @click="saveProfile" 
            :disabled="isSaving"
          >
            {{ isSaving ? 'Đang lưu...' : 'Lưu thay đổi' }}
          </button>
        </template>
      </div>
    </header>

    <div v-if="isLoading" class="py-24 text-center">
      <i class="mdi mdi-loading mdi-spin text-3xl text-zinc-400"></i>
      <p class="mt-4 text-zinc-500 font-medium">Đang đồng bộ dữ liệu...</p>
    </div>

    <div v-else-if="errorMessage" class="py-24 text-center rounded-xl bg-red-50 border border-red-100 mt-8">
      <i class="mdi mdi-alert-circle text-3xl text-red-500"></i>
      <p class="mt-4 text-red-700 font-medium">{{ errorMessage }}</p>
      <button class="mt-6 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50" @click="loadProfile">Thử lại</button>
    </div>

    <div v-else-if="profile" class="mt-12 space-y-12">
      <!-- Hero Avatar Section -->
      <section class="flex flex-col md:flex-row items-center md:items-start gap-8">
        <div class="relative group shrink-0">
          <div 
            class="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-200"
            :style="(previewAvatarUrl || profile.avatarUrl) && !isSaving ? { backgroundImage: `url(${previewAvatarUrl || profile.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}"
          >
            <i v-if="!previewAvatarUrl && !profile.avatarUrl && !isSaving" class="mdi mdi-account text-3xl text-zinc-400"></i>
            <i v-if="isSaving" class="mdi mdi-loading mdi-spin text-2xl text-zinc-500"></i>
          </div>
          <button 
            v-if="isEditing"
            @click="triggerFileInput"
            class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
            title="Đổi ảnh đại diện"
          >
            <i class="mdi mdi-camera text-sm"></i>
          </button>
          <input v-if="isEditing" type="file" ref="fileInputRef" @change="handleFileChange" accept="image/jpeg, image/png, image/webp" class="hidden" />
        </div>
        
        <div class="flex-1 text-center md:text-left pt-2">
          <h2 class="text-2xl font-medium text-zinc-900">{{ profile.fullName || "—" }}</h2>
          <div class="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <span class="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 uppercase tracking-wider">
              {{ formatRole(profile.role || authStore.currentRole) }}
            </span>
            <span class="text-sm text-zinc-500">{{ profile.email || "—" }}</span>
          </div>
        </div>
      </section>

      <!-- Grid Data -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div class="col-span-1 md:col-span-2">
          <h3 class="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Thông tin liên lạc</h3>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-zinc-500">Họ và tên</label>
          <input v-if="isEditing" type="text" v-model="formData.fullName" class="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-shadow" />
          <div v-else class="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-zinc-900 font-medium">{{ profile.fullName || "—" }}</div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-zinc-500">Số điện thoại</label>
          <input v-if="isEditing" type="text" v-model="formData.phone" class="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-shadow" />
          <div v-else class="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-zinc-900 font-medium">{{ profile.phone || "—" }}</div>
        </div>

        <div class="col-span-1 md:col-span-2 mt-4">
          <h3 class="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Định danh cá nhân</h3>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-zinc-500">Giới tính</label>
          <select v-if="isEditing" v-model="formData.gender" class="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-shadow">
            <option value="">Chọn giới tính</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="OTHER">Khác</option>
          </select>
          <div v-else class="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-zinc-900 font-medium">{{ getGenderLabel(profile.gender) }}</div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-zinc-500">Ngày sinh</label>
          <input v-if="isEditing" type="date" v-model="formData.dateOfBirth" class="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-shadow" />
          <div v-else class="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-zinc-900 font-medium">{{ profile.dateOfBirth || "—" }}</div>
        </div>

        <div class="col-span-1 md:col-span-2 mt-4">
          <h3 class="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Trạng thái hệ thống</h3>
        </div>

        <div class="space-y-2 opacity-70">
          <label class="block text-sm font-medium text-zinc-500">Email (Chỉ đọc)</label>
          <div class="px-3 py-2 bg-zinc-100 border border-zinc-200 rounded-md text-zinc-700 font-medium cursor-not-allowed">{{ profile.email || "—" }}</div>
        </div>

        <div class="space-y-2 opacity-70">
          <label class="block text-sm font-medium text-zinc-500">Trạng thái (Chỉ đọc)</label>
          <div class="px-3 py-2 bg-zinc-100 border border-zinc-200 rounded-md text-zinc-700 font-medium cursor-not-allowed">{{ getStatusLabel(profile.status) }}</div>
        </div>
      </section>
    </div>

    <!-- Cropper Modal -->
    <div v-if="showCropper" class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all">
        <div class="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <h3 class="text-base font-semibold text-zinc-900">Điều chỉnh ảnh đại diện</h3>
          <button @click="cancelCrop" class="text-zinc-400 hover:text-zinc-600 transition-colors">
            <i class="mdi mdi-close text-xl"></i>
          </button>
        </div>
        
        <div class="bg-zinc-950 p-6 flex justify-center items-center h-[350px]">
          <Cropper
            ref="cropperRef"
            class="w-full h-full"
            :src="imageToCrop"
            :stencil-component="CircleStencil"
            :stencil-props="{ aspectRatio: 1 }"
            image-restriction="stencil"
          />
        </div>

        <div class="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
          <button @click="cancelCrop" class="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
            Hủy
          </button>
          <button @click="applyCrop" class="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors shadow-sm">
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
