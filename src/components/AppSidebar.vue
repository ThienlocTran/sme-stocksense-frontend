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
  
  const traceLogo = document.querySelector('.sidebar-logo-full .trace-logo');
  const greenPath = document.querySelector('.sidebar-logo-full .trace-logo .running-light-path');
  const whitePath = document.querySelector('.sidebar-logo-full .trace-logo .running-light-path-white');
  
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
    titleKey: "operations",
    items: [
      {
        label: "Tổng quan",
        labelKey: "dashboard",
        to: "/dashboard",
        icon: "mdi-view-dashboard-outline",
      },
      {
        label: "Sản phẩm",
        labelKey: "products",
        to: "/products",
        icon: "mdi-package-variant-closed",
      },
      {
        label: "Danh mục",
        labelKey: "categories",
        to: "/categories",
        icon: "mdi-shape-outline",
      },
      {
        label: "Kho hàng",
        labelKey: "warehouses",
        to: "/warehouses",
        icon: "mdi-store-24-hour",
      },
      {
        label: "Đối tác",
        labelKey: "partners",
        to: "/partners",
        icon: "mdi-truck-delivery-outline",
      },
      {
        label: "Tồn kho",
        labelKey: "inventory",
        to: "/inventory",
        icon: "mdi-clipboard-list-outline",
      },
      { label: "Phiếu nhập kho", labelKey: "stockIn", to: "/stock-in", icon: "mdi-tray-arrow-down" },
      { label: "Phiếu xuất kho", labelKey: "stockOut", to: "/stock-out", icon: "mdi-tray-arrow-up" },
      {
        label: "Kiểm kê kho",
        labelKey: "inventoryCounts",
        to: "/inventory-counts",
        icon: "mdi-clipboard-check-outline",
      },
    ],
  },
  {
    title: "Phân tích",
    titleKey: "analytics",
    items: [
      { label: "Dự báo AI", labelKey: "forecast", to: "/forecast", icon: "mdi-chart-line" },
      { label: "Cảnh báo tồn kho", labelKey: "alerts", to: "/alerts", icon: "mdi-alert-outline" },
      {
        label: "Gợi ý nhập hàng",
        labelKey: "replenishment",
        to: "/replenishment-suggestions",
        icon: "mdi-clipboard-text-play-outline",
      },
      {
        label: "Lịch sử giao dịch",
        labelKey: "transactions",
        to: "/inventory-transactions",
        icon: "mdi-history",
      },
    ],
  },
  {
    title: "Phê duyệt",
    titleKey: "approvals",
    items: [
      {
        label: "Phiếu chờ duyệt",
        labelKey: "pendingApprovals",
        to: "/approvals",
        icon: "mdi-check-decagram-outline",
      },
    ],
  },
  {
    title: "Quản lý",
    titleKey: "management",
    items: [
      {
        label: "Nhân viên",
        labelKey: "employees",
        to: "/employees",
        icon: "mdi-account-group-outline",
      },
      {
        label: "Import Excel",
        labelKey: "importExcel",
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
      <div class="sidebar-logo-full">
        <StockSenseFullLogo class="base-logo" />
        <StockSenseFullLogo class="trace-logo" :isTrace="true" />
      </div>
      <div class="sidebar-logo-collapsed">
        <StockSenseMark />
      </div>
    </RouterLink>
    <nav class="nav-list">
      <template
        v-for="section in visibleSections"
        :key="section.title || 'main'"
      >
        <div v-if="section.title" class="sidebar-heading">
          {{ $t('sidebar.sections.' + section.titleKey) || section.title }}
        </div>
        <div class="sidebar-section">
          <RouterLink
            v-for="item in section.items"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            :data-tooltip="$t('sidebar.menu.' + item.labelKey) || item.label"
            @click="layoutStore.closeMobileSidebar"
          >
            <i class="mdi" :class="item.icon" aria-hidden="true"></i>
            <span>{{ $t('sidebar.menu.' + item.labelKey) || item.label }}</span>
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
  transition: width 180ms ease, left 180ms ease, background-color 300ms ease, border-color 300ms ease;
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
.sidebar-logo-full {
  display: block;
  position: relative;
  width: 100%;
  max-width: 180px;
  aspect-ratio: 1254 / 250;
  height: auto;
  overflow: hidden;
}
.sidebar-logo-full :deep(.svg-content) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: auto;
  transform: translateY(-39.872%);
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
.sidebar-logo-collapsed {
  display: none;
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
  .sidebar-logo-full {
    display: none !important;
  }
  .sidebar-logo-collapsed {
    display: block !important;
    width: 38px;
    height: 38px;
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

/* Dark Mode logo overrides */
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#01"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#021"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#022"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#032"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#033"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#052"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#0a2"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#112"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#122"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#173"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#193"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#223"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#294"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#2b4"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#324"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#344"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#3b5"]),
html.dark .sidebar-logo-full :deep(svg path[style*="fill:#445"]) {
  fill: #f1f5f9 !important;
}

html.dark .sidebar-logo-full {
  filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.45));
}
html.dark .sidebar-logo-collapsed {
  filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.45));
}
</style>
