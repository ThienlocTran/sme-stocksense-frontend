<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header Page -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-white m-0">Danh sách đối tác</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Quản lý danh sách nhà cung cấp, khách hàng và thông tin liên hệ của doanh nghiệp</p>
      </div>
      
      <!-- Add Button (Visible only to Admin/Manager) -->
      <div v-if="canManage">
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          rounded="xl"
          class="text-none font-semibold px-4 shadow-md bg-violet-600 border-none"
          @click="showFeatureNotImplemented('Thêm mới đối tác')"
        >
          Thêm đối tác
        </v-btn>
      </div>
    </div>

    <!-- Alert / Toast Banner for Mock Status -->
    <div 
      v-if="isMockData"
      class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex items-start gap-3 transition-all duration-300"
    >
      <i class="mdi mdi-alert-circle text-amber-500 text-xl mt-0.5"></i>
      <div>
        <h4 class="font-semibold text-amber-800 dark:text-amber-400 text-sm m-0">Chế độ dữ liệu mô phỏng (Mock Data)</h4>
        <p class="text-xs text-amber-700 dark:text-amber-500 mt-1">
          Hệ thống đang hiển thị dữ liệu mô phỏng do chưa kết nối được tới Backend API (http://localhost:8080). 
          Bộ lọc và tìm kiếm vẫn hoạt động giả lập cục bộ bình thường.
        </p>
      </div>
    </div>

    <!-- Stats Summary Widgets -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          <i class="mdi mdi-account-multiple text-xl"></i>
        </div>
        <div>
          <span class="text-xs text-slate-400 dark:text-slate-500 block">Tổng đối tác</span>
          <span class="text-lg font-bold text-slate-800 dark:text-white">{{ stats.total }}</span>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
        <div class="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400">
          <i class="mdi mdi-truck-delivery-outline text-xl"></i>
        </div>
        <div>
          <span class="text-xs text-slate-400 dark:text-slate-500 block">Nhà cung cấp</span>
          <span class="text-lg font-bold text-slate-800 dark:text-white">{{ stats.providers }}</span>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
        <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
          <i class="mdi mdi-account-cash-outline text-xl"></i>
        </div>
        <div>
          <span class="text-xs text-slate-400 dark:text-slate-500 block">Khách hàng</span>
          <span class="text-lg font-bold text-slate-800 dark:text-white">{{ stats.customers }}</span>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
        <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
          <i class="mdi mdi-handshake text-xl"></i>
        </div>
        <div>
          <span class="text-xs text-slate-400 dark:text-slate-500 block">Cả hai vai trò</span>
          <span class="text-lg font-bold text-slate-800 dark:text-white">{{ stats.both }}</span>
        </div>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
      <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Bộ lọc đối tác</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Search input -->
        <div class="relative">
          <input
            v-model="filters.keyword"
            type="text"
            placeholder="Tìm theo mã, tên, SĐT..."
            class="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 dark:text-slate-100"
            @input="debouncedFetch"
          />
          <i class="mdi mdi-magnify absolute left-3.5 top-2.5 text-slate-400 text-lg"></i>
        </div>

        <!-- Type selector -->
        <div>
          <select
            v-model="filters.loaiDoiTac"
            class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 dark:text-slate-100"
            @change="fetchPartners"
          >
            <option value="">Tất cả loại đối tác</option>
            <option value="NHA_CUNG_CAP">Nhà cung cấp</option>
            <option value="KHACH_HANG">Khách hàng</option>
            <option value="CA_HAI">Cả hai</option>
          </select>
        </div>

        <!-- Status selector -->
        <div>
          <select
            v-model="filters.trangThai"
            class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 dark:text-slate-100"
            @change="fetchPartners"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="HOAT_DONG">Đang hoạt động</option>
            <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
          </select>
        </div>

        <!-- Reset Button -->
        <div>
          <v-btn
            variant="outlined"
            rounded="xl"
            class="w-full text-none border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold h-[38px] flex items-center justify-center gap-1"
            @click="resetFilters"
          >
            <i class="mdi mdi-filter-off text-base"></i> Xóa bộ lọc
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="p-12 flex flex-col items-center justify-center gap-3">
        <v-progress-circular indeterminate color="violet-600"></v-progress-circular>
        <span class="text-sm text-slate-500 dark:text-slate-400">Đang tải danh sách đối tác...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="partners.length === 0" class="p-12 flex flex-col items-center justify-center text-center">
        <div class="h-16 w-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-600 mb-4">
          <i class="mdi mdi-account-search-outline text-3xl"></i>
        </div>
        <h3 class="text-base font-bold text-slate-700 dark:text-slate-300">Không tìm thấy đối tác nào</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">Hãy thử thay đổi từ khóa tìm kiếm hoặc các tiêu chí bộ lọc</p>
      </div>

      <!-- Data Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="bg-slate-50/75 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-28">Mã</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tên đối tác</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-32">Loại</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Người liên hệ</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Thông tin liên hệ</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-36">Trạng thái</th>
              <th v-if="canManage" class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-28 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
            <tr 
              v-for="partner in partners" 
              :key="partner.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
            >
              <!-- Mã đối tác -->
              <td class="px-6 py-4">
                <span class="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  {{ partner.maDoiTac }}
                </span>
              </td>
              
              <!-- Tên đối tác -->
              <td class="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100 text-sm">
                {{ partner.tenDoiTac }}
              </td>
              
              <!-- Loại đối tác -->
              <td class="px-6 py-4">
                <span 
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="getTypeBadgeClass(partner.loaiDoiTac)"
                >
                  <i class="mdi" :class="getTypeIcon(partner.loaiDoiTac)"></i>
                  {{ mapTypeLabel(partner.loaiDoiTac) }}
                </span>
              </td>
              
              <!-- Người liên hệ -->
              <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                {{ partner.nguoiLienHe || '—' }}
              </td>
              
              <!-- Thông tin liên hệ (SĐT / Email) -->
              <td class="px-6 py-4 text-xs space-y-1">
                <div class="flex items-center gap-1 text-slate-600 dark:text-slate-300" v-if="partner.soDienThoai">
                  <i class="mdi mdi-phone text-slate-400 text-sm"></i>
                  <span>{{ partner.soDienThoai }}</span>
                </div>
                <div class="flex items-center gap-1 text-slate-600 dark:text-slate-300" v-if="partner.email">
                  <i class="mdi mdi-email-outline text-slate-400 text-sm"></i>
                  <span>{{ partner.email }}</span>
                </div>
                <span v-if="!partner.soDienThoai && !partner.email" class="text-slate-400">—</span>
              </td>
              
              <!-- Trạng thái -->
              <td class="px-6 py-4">
                <span 
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  :class="partner.trangThai === 'HOAT_DONG' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60'"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="partner.trangThai === 'HOAT_DONG' ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                  {{ mapStatusLabel(partner.trangThai) }}
                </span>
              </td>
              
              <!-- Thao tác (chỉ hiển thị cho Admin/Manager) -->
              <td v-if="canManage" class="px-6 py-4 text-center">
                <div class="flex items-center justify-center gap-2">
                  <v-btn
                    icon
                    density="comfortable"
                    variant="text"
                    color="primary"
                    @click="showFeatureNotImplemented('Chỉnh sửa đối tác')"
                  >
                    <i class="mdi mdi-pencil-outline text-lg"></i>
                  </v-btn>
                  <v-btn
                    icon
                    density="comfortable"
                    variant="text"
                    :color="partner.trangThai === 'HOAT_DONG' ? 'error' : 'success'"
                    @click="showFeatureNotImplemented(partner.trangThai === 'HOAT_DONG' ? 'Ngừng hoạt động đối tác' : 'Kích hoạt lại đối tác')"
                  >
                    <i class="mdi" :class="partner.trangThai === 'HOAT_DONG' ? 'mdi-block-helper' : 'mdi-check-circle-outline'"></i>
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Feature Toast Dialog Notification -->
    <v-dialog v-model="dialog.show" max-width="400">
      <v-card class="rounded-2xl p-4">
        <v-card-title class="flex items-center gap-2 text-slate-800 dark:text-white font-bold pb-2 border-b border-slate-100 dark:border-slate-800 text-base">
          <i class="mdi mdi-information-outline text-violet-600 text-xl"></i>
          <span>Thông báo tính năng</span>
        </v-card-title>
        <v-card-text class="pt-4 text-sm text-slate-600 dark:text-slate-300">
          Tính năng <strong>"{{ dialog.feature }}"</strong> thuộc phạm vi của task tiếp theo (**T52 - Form Thêm/Sửa đối tác**) và chưa được triển khai ở task danh sách này.
        </v-card-text>
        <v-card-actions class="justify-end pt-2">
          <v-btn
            color="violet-600"
            variant="flat"
            rounded="xl"
            class="text-none text-white font-semibold"
            @click="dialog.show = false"
          >
            Đã hiểu
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

// State
const partners = ref([])
const loading = ref(false)
const isMockData = ref(false)

const filters = reactive({
  keyword: '',
  loaiDoiTac: '',
  trangThai: ''
})

const dialog = reactive({
  show: false,
  feature: ''
})

// Check role logic
const canManage = computed(() => {
  return authStore.currentRole === 'ADMIN' || authStore.currentRole === 'MANAGER'
})

// MOCK DATA phục vụ fallback
const mockPartners = [
  {
    id: 1,
    maDoiTac: 'NCC001',
    tenDoiTac: 'Công ty Cổ phần Vận tải & Logistics ABC',
    loaiDoiTac: 'NHA_CUNG_CAP',
    nguoiLienHe: 'Nguyễn Văn Hùng',
    soDienThoai: '0987654321',
    email: 'hung.nguyen@abc-logistics.com',
    diaChi: '123 Lê Lợi, Quận 1, TP. HCM',
    trangThai: 'HOAT_DONG'
  },
  {
    id: 2,
    maDoiTac: 'KH002',
    tenDoiTac: 'Đại lý Bán lẻ Minh Minh',
    loaiDoiTac: 'KHACH_HANG',
    nguoiLienHe: 'Trần Thị Minh',
    soDienThoai: '0912345678',
    email: 'minh.tran@minhminh.vn',
    diaChi: '456 Nguyễn Huệ, Quận 3, TP. HCM',
    trangThai: 'HOAT_DONG'
  },
  {
    id: 3,
    maDoiTac: 'CH003',
    tenDoiTac: 'Hợp tác xã Nông nghiệp Xanh',
    loaiDoiTac: 'CA_HAI',
    nguoiLienHe: 'Lê Hoàng Nam',
    soDienThoai: '0905112233',
    email: 'nam.le@nongnghiepxanh.org',
    diaChi: 'Đường 30/4, Quận Hải Châu, Đà Nẵng',
    trangThai: 'NGUNG_HOAT_DONG'
  },
  {
    id: 4,
    maDoiTac: 'NCC004',
    tenDoiTac: 'Công ty TNHH Nhập khẩu Việt Trung',
    loaiDoiTac: 'NHA_CUNG_CAP',
    nguoiLienHe: 'Chu Quốc Bảo',
    soDienThoai: '0944889900',
    email: 'bao.chu@viettrungimex.com',
    diaChi: 'Cửa khẩu Hữu Nghị, Lạng Sơn',
    trangThai: 'HOAT_DONG'
  },
  {
    id: 5,
    maDoiTac: 'KH005',
    tenDoiTac: 'Siêu thị MartOne Việt Nam',
    loaiDoiTac: 'KHACH_HANG',
    nguoiLienHe: 'Phạm Minh Anh',
    soDienThoai: '0966554433',
    email: 'minhanh@martone.com.vn',
    diaChi: '789 Lạc Long Quân, Quận Tây Hồ, Hà Nội',
    trangThai: 'HOAT_DONG'
  }
]

// Computed stats
const stats = computed(() => {
  const currentList = isMockData.value ? getLocalFilteredMock() : partners.value
  return {
    total: currentList.length,
    providers: currentList.filter(p => p.loaiDoiTac === 'NHA_CUNG_CAP').length,
    customers: currentList.filter(p => p.loaiDoiTac === 'KHACH_HANG').length,
    both: currentList.filter(p => p.loaiDoiTac === 'CA_HAI').length
  }
})

// MAPPING LABEL
const mapTypeLabel = (type) => {
  switch (type) {
    case 'NHA_CUNG_CAP': return 'Nhà cung cấp'
    case 'KHACH_HANG': return 'Khách hàng'
    case 'CA_HAI': return 'Cả hai'
    default: return type
  }
}

const mapStatusLabel = (status) => {
  switch (status) {
    case 'HOAT_DONG': return 'Đang hoạt động'
    case 'NGUNG_HOAT_DONG': return 'Ngừng hoạt động'
    default: return status
  }
}

// BADGE STYLING
const getTypeBadgeClass = (type) => {
  switch (type) {
    case 'NHA_CUNG_CAP': return 'bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30'
    case 'KHACH_HANG': return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
    case 'CA_HAI': return 'bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30'
    default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
  }
}

const getTypeIcon = (type) => {
  switch (type) {
    case 'NHA_CUNG_CAP': return 'mdi-truck-delivery-outline'
    case 'KHACH_HANG': return 'mdi-account-cash-outline'
    case 'CA_HAI': return 'mdi-handshake'
    default: return 'mdi-help-circle-outline'
  }
}

// CALL API HOẶC LOCAL FALLBACK
const fetchPartners = async () => {
  loading.value = true
  try {
    // Gọi API thật từ backend
    const params = {}
    if (filters.keyword.trim()) params.keyword = filters.keyword.trim()
    if (filters.loaiDoiTac) params.loaiDoiTac = filters.loaiDoiTac
    if (filters.trangThai) params.trangThai = filters.trangThai

    // Định cấu hình headers nếu có token
    const config = { params }
    if (authStore.token) {
      config.headers = { Authorization: `Bearer ${authStore.token}` }
    }

    const response = await axios.get('http://localhost:8080/api/partners', config)
    partners.value = response.data
    isMockData.value = false
  } catch (error) {
    console.warn('Backend API connection failed, falling back to local mock data.', error)
    // Nếu gọi API thật lỗi, kích hoạt Mock mode và tự lọc cục bộ
    isMockData.value = true
    partners.value = getLocalFilteredMock()
  } finally {
    loading.value = false
  }
}

// Xử lý lọc cục bộ cho Mock Data
const getLocalFilteredMock = () => {
  return mockPartners.filter(item => {
    // Filter keyword
    if (filters.keyword.trim()) {
      const kw = filters.keyword.toLowerCase().trim()
      const matchName = item.tenDoiTac.toLowerCase().includes(kw)
      const matchCode = item.maDoiTac.toLowerCase().includes(kw)
      const matchPhone = item.soDienThoai && item.soDienThoai.includes(kw)
      const matchContact = item.nguoiLienHe && item.nguoiLienHe.toLowerCase().includes(kw)
      if (!matchName && !matchCode && !matchPhone && !matchContact) return false
    }
    // Filter type
    if (filters.loaiDoiTac && item.loaiDoiTac !== filters.loaiDoiTac) {
      return false
    }
    // Filter status
    if (filters.trangThai && item.trangThai !== filters.trangThai) {
      return false
    }
    return true
  })
}

// Reset filters
const resetFilters = () => {
  filters.keyword = ''
  filters.loaiDoiTac = ''
  filters.trangThai = ''
  fetchPartners()
}

// Debounce search input
let timeoutId = null
const debouncedFetch = () => {
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = setTimeout(() => {
    fetchPartners()
  }, 300)
}

// Toast modal trigger
const showFeatureNotImplemented = (featureName) => {
  dialog.feature = featureName
  dialog.show = true
}

onMounted(() => {
  fetchPartners()
})
</script>

<style scoped>
/* Custom styled select elements */
select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1em;
  padding-right: 2.5rem;
}
</style>
