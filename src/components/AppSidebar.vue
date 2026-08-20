<script setup>
import { computed, onMounted } from "vue";
import { useAuthStore } from "../stores/auth";
import { useLayoutStore } from "../stores/layout";
import { canAccessRoute } from "../services/permissionService";
import StockSenseFullLogo from "./branding/StockSenseFullLogo.vue";
import StockSenseMark from "./branding/StockSenseMark.vue";
import { gsap } from "gsap";

const authStore = useAuthStore();
const layoutStore = useLayoutStore();
const currentRole = computed(() => authStore.currentRole);

let isSidebarTracing = false;

function playSidebarTraceAnimation() {
  if (isSidebarTracing) return;
  
  const traceLogo = document.querySelector('.sidebar-logo-wrap .trace-logo');
  const greenPath = document.querySelector('.sidebar-logo-wrap .trace-logo .running-light-path');
  const whitePath = document.querySelector('.sidebar-logo-wrap .trace-logo .running-light-path-white');
  
  if (traceLogo && greenPath && whitePath) {
    isSidebarTracing = true;
    const traceLen = greenPath.getTotalLength();
    
    gsap.set(traceLogo, { opacity: 0 });
    gsap.set([greenPath, whitePath], {
      strokeDasharray: `${traceLen * 0.20} ${traceLen * 0.80}`,
      strokeDashoffset: 0
    });
    
    const tl = gsap.timeline({
      onComplete: () => {
        isSidebarTracing = false;
      }
    });
    
    tl.to(traceLogo, {
      opacity: 1,
      duration: 0.15,
      ease: 'power1.out'
    }, 0);
    
    tl.to([greenPath, whitePath], {
      strokeDashoffset: -traceLen,
      duration: 1.8,
      ease: 'power2.inOut'
    }, 0);
    
    tl.to(traceLogo, {
      opacity: 0,
      duration: 0.3,
      ease: 'power1.in'
    }, 1.5);
  }
}

onMounted(() => {
  setTimeout(playSidebarTraceAnimation, 600);
});

const menuSections = [
  {
    title: "Vận hành",
    items: [
      {
        label: "Tổng quan",
        to: "/dashboard",
        icon: "mdi-view-dashboard-outline",
      },
      {
        label: "Sản phẩm",
        to: "/products",
        icon: "mdi-package-variant-closed",
      },
      {
        label: "Danh mục",
        to: "/categories",
        icon: "mdi-shape-outline",
      },
      {
        label: "Tồn kho",
        to: "/inventory",
        icon: "mdi-clipboard-list-outline",
      },
      { label: "Phiếu nhập kho", to: "/stock-in", icon: "mdi-tray-arrow-down" },
      { label: "Phiếu xuất kho", to: "/stock-out", icon: "mdi-tray-arrow-up" },
      {
        label: "Kiểm kê kho",
        to: "/inventory-counts",
        icon: "mdi-clipboard-check-outline",
      },
    ],
  },
  {
    title: "Phân tích",
    items: [
      { label: "Dự báo AI", to: "/forecast", icon: "mdi-chart-line" },
      { label: "Cảnh báo tồn kho", to: "/alerts", icon: "mdi-alert-outline" },
      {
        label: "Lịch sử giao dịch",
        to: "/inventory-transactions",
        icon: "mdi-history",
      },
    ],
  },
  {
    title: "Phê duyệt",
    items: [
      {
        label: "Phiếu nhập chờ duyệt",
        to: "/approvals",
        icon: "mdi-check-decagram-outline",
      },
      {
        label: "Phiếu xuất chờ duyệt",
        to: "/pending-export-approvals",
        icon: "mdi-file-clock-outline",
      },
    ],
  },
  {
    title: "Quản lý",
    items: [
      {
        label: "Đối tác",
        to: "/partners",
        icon: "mdi-truck-delivery-outline",
      },
      {
        label: "Nhân viên",
        to: "/employees",
        icon: "mdi-account-group-outline",
      },
      {
        label: "Import Excel",
        to: "/import-excel",
        icon: "mdi-file-excel-outline",
      },
    ],
  },
];

const visibleSections = computed(() =>
  menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        canAccessRoute(item.to, currentRole.value),
      ),
    }))
    .filter((section) => section.items.length > 0),
);
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--mobile-open': layoutStore.isMobileOpen }">
    <RouterLink 
      to="/dashboard" 
      class="brand" 
      @click="layoutStore.closeMobileSidebar"
      @mouseenter="playSidebarTraceAnimation"
    >
      <div class="sidebar-logo-wrap">
        <StockSenseMark class="base-logo" />
        <StockSenseMark class="trace-logo" :isTrace="true" />
      </div>
    </RouterLink>
    <nav class="nav-list">
      <template
        v-for="section in visibleSections"
        :key="section.title || 'main'"
      >
        <div v-if="section.title" class="sidebar-heading">
          {{ section.title }}
        </div>
        <div class="sidebar-section">
          <RouterLink
            v-for="item in section.items"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            :data-tooltip="item.label"
            @click="layoutStore.closeMobileSidebar"
          >
            <i class="mdi" :class="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>
      </template>
    </nav>
    <div 
      class="sidebar-user" 
      v-if="authStore.currentUser" 
      @click="$router.push('/profile'); layoutStore.closeMobileSidebar()"
    >
      <div 
        class="user-avatar"
        :style="authStore.currentUser.avatarUrl && !authStore.currentUser.avatarUrl.includes('/null') ? { backgroundImage: `url(${authStore.currentUser.avatarUrl})` } : {}"
      >
        <i v-if="!authStore.currentUser.avatarUrl || authStore.currentUser.avatarUrl.includes('/null')" class="mdi mdi-account"></i>
      </div>
      <div class="user-info">
        <strong>{{ authStore.currentUser.fullName || authStore.currentUser.email }}</strong>
        <span>{{ authStore.currentUser.role || authStore.currentRole }}</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 240px;
  height: 100vh;
  background: var(--color-surface);
  color: var(--color-text-primary);
  border-right: 1px solid var(--color-border);
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  z-index: 20;
  transition: width 180ms ease, left 180ms ease;
}
.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px 18px;
  border-bottom: 1px solid var(--color-border);
}
.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: var(--color-brand);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  font-size: 20px;
}
.sidebar-logo-wrap {
  display: block;
  position: relative;
  width: 48px;
  height: 48px;
  overflow: hidden;
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
  opacity: 0;
}
.nav-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}
.nav-list::-webkit-scrollbar {
  width: 4px;
}
.nav-list::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}
.sidebar-heading {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding-left: 4px;
  margin-bottom: 6px;
}
.sidebar-section {
  display: grid;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 40px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--color-text-secondary);
  font-weight: 600;
  background: transparent;
  transition:
    background 160ms ease,
    transform 160ms ease,
    color 160ms ease;
}
.nav-item:hover {
  background: var(--color-brand-soft);
  color: var(--color-brand);
}
.nav-item.router-link-active {
  background: var(--color-brand-soft);
  color: var(--color-brand);
}
.nav-item i {
  font-size: 20px;
  width: 24px;
  text-align: center;
}
.sidebar-user {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  background: var(--color-bg);
  transition: background 160ms ease, border-color 160ms ease;
}
.sidebar-user:hover {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
}
.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--color-border-strong);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.user-avatar i {
  color: var(--color-text-secondary);
  font-size: 20px;
}
.user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.user-info strong {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-info span {
  color: var(--color-text-secondary);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Collapsed view (1024px to 1279px) */
@media (min-width: 1024px) and (max-width: 1279px) {
  .sidebar {
    width: 72px;
    padding: 18px 10px;
  }
  .brand {
    justify-content: center;
    padding: 8px 0 18px;
  }
  .sidebar-logo-wrap {
    width: 38px !important;
    height: 38px !important;
  }
  .brand span,
  .sidebar-heading,
  .nav-item span,
  .user-info {
    display: none !important;
  }
  .nav-item {
    justify-content: center;
    position: relative;
  }
  /* CSS Tooltip on Hover when Collapsed */
  .nav-item::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    background: var(--color-text-primary);
    color: var(--color-surface);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 150ms ease;
    margin-left: 12px;
    z-index: 100;
    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
  }
  .nav-item:hover::after {
    opacity: 1;
  }
  .sidebar-user {
    justify-content: center;
    padding: 8px;
  }
}

/* Mobile Viewport Drawer rules */
@media (max-width: 1023px) {
  .sidebar {
    position: fixed;
    left: -240px;
    width: 240px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  }
  .sidebar.sidebar--mobile-open {
    left: 0;
  }
}
</style>
