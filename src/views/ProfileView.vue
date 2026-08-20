<script setup>
import { onMounted, ref, reactive } from "vue";
import { useI18n } from 'vue-i18n';
import { useAuthStore } from "../stores/auth";
import { getCurrentProfile, updateProfile, uploadAvatar } from "../services/profileService";
import { formatRole } from "../services/authService";
import { Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';

const authStore = useAuthStore();
const { t } = useI18n();
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
  if (gender === 'MALE') return t("profile.gender.male");
  if (gender === 'FEMALE') return t("profile.gender.female");
  if (gender === 'OTHER') return t("profile.gender.other");
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
    errorMessage.value = error?.message || t("profile.error.load");
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
      try {
        updatedProfile = await uploadAvatar(pendingAvatarFile.value);
      } catch (uploadError) {
        pendingAvatarFile.value = null;
        previewAvatarUrl.value = "";
        throw uploadError;
      }
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
    alert(error?.message || t("profile.error.update"));
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
    alert(t("profile.error.fileSize"));
    event.target.value = "";
    return;
  }

  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    alert(t("profile.error.fileType"));
    event.target.value = "";
    return;
  }

  imageToCrop.value = URL.createObjectURL(file);
  showCropper.value = true;
  event.target.value = "";
}

function cancelCrop() {
  if (imageToCrop.value && imageToCrop.value.startsWith("blob:")) {
    URL.revokeObjectURL(imageToCrop.value);
  }
  showCropper.value = false;
  imageToCrop.value = "";
}

async function applyCrop() {
  if (!cropperRef.value) return;
  
  const result = cropperRef.value.getResult();
  const cropperCanvas = result?.canvas;
  
  if (cropperCanvas) {
    const squareCanvas = document.createElement("canvas");
    squareCanvas.width = 512;
    squareCanvas.height = 512;
    const ctx = squareCanvas.getContext("2d");
    
    if (ctx) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(cropperCanvas, 0, 0, 512, 512);
      
      squareCanvas.toBlob((blob) => {
        if (blob) {
          if (previewAvatarUrl.value && previewAvatarUrl.value.startsWith("blob:")) {
            URL.revokeObjectURL(previewAvatarUrl.value);
          }
          const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
          pendingAvatarFile.value = file;
          previewAvatarUrl.value = URL.createObjectURL(file);
        }
        
        if (imageToCrop.value && imageToCrop.value.startsWith("blob:")) {
          URL.revokeObjectURL(imageToCrop.value);
        }
        
        showCropper.value = false;
        imageToCrop.value = "";
      }, "image/jpeg", 0.9);
    }
  }
}

onMounted(() => {
  loadProfile();
});
</script>

<template>
  <main class="w-full max-w-4xl mx-auto py-12 px-6">
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[var(--color-border)]">
      <div>
        <h1 class="text-3xl font-medium tracking-tight text-[var(--color-text-primary)]">{{ t("profile.title") }}</h1>
        <p class="mt-2 text-[var(--color-text-secondary)]">{{ t("profile.description") }}</p>
      </div>
      <div class="flex items-center gap-3">
        <button 
          v-if="profile && !isEditing" 
          class="btn btn-primary"
          @click="toggleEdit"
        >
          Sửa hồ sơ
        </button>
        <template v-if="isEditing">
          <button 
            class="btn btn-secondary"
            @click="toggleEdit"
          >
            Hủy
          </button>
          <button 
            class="btn btn-primary"
            @click="saveProfile" 
            :disabled="isSaving"
          >
            {{ isSaving ? t('profile.btn.saving') : t('profile.btn.save') }}
          </button>
        </template>
      </div>
    </header>

    <div v-if="isLoading" class="py-24 text-center">
      <i class="mdi mdi-loading mdi-spin text-3xl text-[var(--color-primary)]"></i>
      <p class="mt-4 text-[var(--color-text-secondary)] font-medium">{{ t("profile.loading") }}</p>
    </div>

    <div v-else-if="errorMessage" class="py-24 text-center rounded-xl bg-red-50 border border-red-100 mt-8">
      <i class="mdi mdi-alert-circle text-3xl text-red-500"></i>
      <p class="mt-4 text-red-700 font-medium">{{ errorMessage }}</p>
      <button class="mt-6 btn btn-secondary" @click="loadProfile">{{ t("profile.btn.retry") }}</button>
    </div>

    <div v-else-if="profile" class="mt-12 space-y-12">
      <!-- Hero Avatar Section -->
      <section class="flex flex-col md:flex-row items-center md:items-start gap-8">
        <div class="relative group shrink-0">
          <div 
            class="w-24 h-24 rounded-full bg-[var(--color-bg)] flex items-center justify-center overflow-hidden border border-[var(--color-border)]"
            :style="(previewAvatarUrl || (profile.avatarUrl && !profile.avatarUrl.includes('/null'))) && !isSaving ? { backgroundImage: `url(${previewAvatarUrl || profile.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}"
          >
            <i v-if="!previewAvatarUrl && (!profile.avatarUrl || profile.avatarUrl.includes('/null')) && !isSaving" class="mdi mdi-account text-3xl text-[var(--color-text-muted)]"></i>
            <i v-if="isSaving" class="mdi mdi-loading mdi-spin text-2xl text-[var(--color-primary)]"></i>
          </div>
          <button 
            v-if="isEditing"
            @click="triggerFileInput"
            class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-[var(--color-border)] shadow-sm flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            :title="t('profile.cropper.btn.change')"
          >
            <i class="mdi mdi-camera text-sm"></i>
          </button>
          <input v-if="isEditing" type="file" ref="fileInputRef" @change="handleFileChange" accept="image/jpeg, image/png, image/webp" class="hidden" />
        </div>
        
        <div class="flex-1 text-center md:text-left pt-2">
          <h2 class="text-2xl font-medium text-[var(--color-text-primary)]">{{ profile.fullName || "—" }}</h2>
          <div class="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <span class="inline-flex items-center rounded-md bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)] uppercase tracking-wider">
              {{ formatRole(profile.role || authStore.currentRole) }}
            </span>
            <span class="text-sm text-[var(--color-text-secondary)]">{{ profile.email || "—" }}</span>
          </div>
        </div>
      </section>

      <!-- Grid Data -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div class="col-span-1 md:col-span-2">
          <h3 class="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">{{ t("profile.section.contact") }}</h3>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-[var(--color-text-secondary)]">{{ t("profile.field.fullName") }}</label>
          <input v-if="isEditing" type="text" v-model="formData.fullName" class="input" />
          <div v-else class="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] font-medium">{{ profile.fullName || "—" }}</div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-[var(--color-text-secondary)]">{{ t("profile.field.phone") }}</label>
          <input v-if="isEditing" type="text" v-model="formData.phone" class="input" />
          <div v-else class="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] font-medium">{{ profile.phone || "—" }}</div>
        </div>

        <div class="col-span-1 md:col-span-2 mt-4">
          <h3 class="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">{{ t("profile.section.identity") }}</h3>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-[var(--color-text-secondary)]">{{ t("profile.field.gender") }}</label>
          <select v-if="isEditing" v-model="formData.gender" class="select">
            <option value="">{{ t("profile.gender.select") }}</option>
            <option value="MALE">{{ t("profile.gender.male") }}</option>
            <option value="FEMALE">{{ t("profile.gender.female") }}</option>
            <option value="OTHER">{{ t("profile.gender.other") }}</option>
          </select>
          <div v-else class="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] font-medium">{{ getGenderLabel(profile.gender) }}</div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-[var(--color-text-secondary)]">{{ t("profile.field.dob") }}</label>
          <input v-if="isEditing" type="date" v-model="formData.dateOfBirth" class="input" />
          <div v-else class="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] font-medium">{{ profile.dateOfBirth || "—" }}</div>
        </div>

        <div class="col-span-1 md:col-span-2 mt-4">
          <h3 class="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">{{ t("profile.section.system") }}</h3>
        </div>

        <div class="space-y-2 opacity-70">
          <label class="block text-sm font-medium text-[var(--color-text-secondary)]">{{ t("profile.field.email") }}</label>
          <div class="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text-secondary)] font-medium cursor-not-allowed">{{ profile.email || "—" }}</div>
        </div>

        <div class="space-y-2 opacity-70">
          <label class="block text-sm font-medium text-[var(--color-text-secondary)]">{{ t("profile.field.status") }}</label>
          <div class="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text-secondary)] font-medium cursor-not-allowed">{{ getStatusLabel(profile.status) }}</div>
        </div>
      </section>
    </div>

    <!-- Cropper Modal -->
    <div v-if="showCropper" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all">
        <div class="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg)]">
          <h3 class="text-base font-semibold text-[var(--color-text-primary)]">{{ t("profile.cropper.title") }}</h3>
          <button @click="cancelCrop" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            <i class="mdi mdi-close text-xl"></i>
          </button>
        </div>
        
        <div class="bg-slate-900 p-6 flex justify-center items-center h-[350px]">
          <Cropper
            ref="cropperRef"
            class="w-full h-full circular-stencil"
            :src="imageToCrop"
            :stencil-props="{ aspectRatio: 1 }"
            image-restriction="stencil"
          />
        </div>

        <div class="px-6 py-4 bg-[var(--color-bg)] border-t border-[var(--color-border)] flex justify-end gap-3">
          <button @click="cancelCrop" class="btn btn-secondary">
            Hủy
          </button>
          <button @click="applyCrop" class="btn btn-primary">
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.circular-stencil :deep(.vue-rectangle-stencil) {
  border-radius: 50% !important;
}
</style>
