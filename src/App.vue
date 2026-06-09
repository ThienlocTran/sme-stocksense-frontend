<template>
  <v-app class="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
    <!-- Navigation Drawer (Sidebar) -->
    <v-navigation-drawer
      v-model="drawer"
      elevation="1"
      class="border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
      width="260"
    >
      <!-- Brand Logo / Info -->
      <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <div class="h-10 w-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/30">
          <i class="mdi mdi-cube-scan text-white text-xl"></i>
        </div>
        <div>
          <h2 class="font-bold text-slate-800 dark:text-white text-base leading-none m-0">SME StockSense</h2>
          <span class="text-[10px] font-semibold tracking-wider uppercase text-violet-600 dark:text-violet-400 mt-1 block">Tồn Kho & Dự Báo</span>
        </div>
      </div>

      <!-- Navigation List -->
      <v-list nav class="px-3 mt-4 space-y-1">
        <v-list-item
          to="/"
          exact
          color="violet-600"
          rounded="xl"
          class="group transition-all"
        >
          <template v-slot:prepend>
            <i class="mdi mdi-view-dashboard text-lg mr-3 text-slate-500 group-hover:text-violet-600 transition-colors"></i>
          </template>
          <v-list-item-title class="font-medium">Tổng quan</v-list-item-title>
        </v-list-item>

        <v-list-item
          to="/partners"
          color="violet-600"
          rounded="xl"
          class="group transition-all"
        >
          <template v-slot:prepend>
            <i class="mdi mdi-handshake-outline text-lg mr-3 text-slate-500 group-hover:text-violet-600 transition-colors"></i>
          </template>
          <v-list-item-title class="font-medium">Quản lý đối tác</v-list-item-title>
        </v-list-item>

        <!-- Warehouses (Placeholder / Disabled) -->
        <v-list-item
          disabled
          rounded="xl"
          class="opacity-60"
        >
          <template v-slot:prepend>
            <i class="mdi mdi-home-warehouse text-lg mr-3 text-slate-400"></i>
          </template>
          <v-list-item-title class="font-medium text-slate-400">Kho hàng (T40)</v-list-item-title>
        </v-list-item>
      </v-list>

      <!-- Bottom System Version -->
      <template v-slot:append>
        <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
          <div class="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Phiên bản: v1.0.0-beta</div>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- App Bar (Header) -->
    <v-app-bar
      elevation="0"
      class="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4"
    >
      <template v-slot:prepend>
        <v-btn
          icon
          variant="text"
          color="slate-600"
          @click="drawer = !drawer"
          class="md:hidden"
        >
          <i class="mdi mdi-menu text-xl"></i>
        </v-btn>
      </template>

      <!-- Page Title -->
      <v-app-bar-title class="font-semibold text-slate-800 dark:text-white text-lg">
        {{ currentRouteTitle }}
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <!-- Right Toolbar Action: Role Switcher (Security Testing UI) -->
      <div class="flex items-center gap-3">
        <!-- Interactive Role Badge & Selector -->
        <div class="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Vai trò test:</span>
          <select
            v-model="authStore.currentRole"
            @change="handleRoleChange"
            class="bg-transparent text-xs font-bold text-violet-600 dark:text-violet-400 border-none outline-none cursor-pointer focus:ring-0"
          >
            <option value="ADMIN">Admin / IT</option>
            <option value="MANAGER">Quản lý kho</option>
            <option value="EMPLOYEE">Thủ kho</option>
          </select>
        </div>

        <!-- System User Status -->
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span class="text-xs text-slate-400 dark:text-slate-500 font-mono font-medium hidden sm:inline">Online</span>
        </div>
      </div>
    </v-app-bar>

    <!-- Main Content Area -->
    <v-main class="bg-slate-50/50 dark:bg-slate-950/20">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const drawer = ref(true)

// Lấy tiêu đề trang từ meta data của route
const currentRouteTitle = computed(() => {
  return route.meta?.title || 'Trang chủ'
})

// Xử lý thay đổi vai trò test trực tiếp trên UI
const handleRoleChange = (event) => {
  authStore.setRole(event.target.value)
}
</script>

<style>
/* CSS transition cho các trang */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Custom class override cho các select option trong dark mode */
select option {
  background-color: white;
  color: #1e293b;
}

.dark select option {
  background-color: #0f172a;
  color: #f1f5f9;
}
</style>
