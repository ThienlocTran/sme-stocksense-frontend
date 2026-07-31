<script setup>
import { computed } from "vue";
import { useAuthStore } from "../stores/auth";
import { canAccessRoute } from "../services/permissionService";

const authStore = useAuthStore();
const currentRole = computed(() => authStore.currentRole);

const menuSections = [
  {
    title: null,
    items: [
      {
        label: "Tổng quan",
        to: "/dashboard",
        icon: "mdi-view-dashboard-outline",
      },
    ],
  },
  {
    title: "Danh mục",
    items: [
      {
        label: "Sản phẩm",
        to: "/products",
        icon: "mdi-package-variant-closed",
      },
      {
        label: "Nhà cung cấp",
        to: "/partners",
        icon: "mdi-truck-delivery-outline",
      },
      { label: "Danh mục", to: "/categories", icon: "mdi-shape-outline" },
      { label: "Kho hàng", to: "/warehouses", icon: "mdi-warehouse" },
    ],
  },
  {
    title: "Quản lý kho",
    items: [
      {
        label: "Tồn kho",
        to: "/inventory",
        icon: "mdi-clipboard-list-outline",
      },
      {
        label: "Lịch sử giao dịch",
        to: "/inventory-transactions",
        icon: "mdi-history",
      },
      { label: "Phiếu nhập kho", to: "/stock-in", icon: "mdi-tray-arrow-down" },
      { label: "Phiếu xuất kho", to: "/stock-out", icon: "mdi-tray-arrow-up" },
    ],
  },
  {
    title: "Chờ duyệt",
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
    title: "Hệ thống",
    items: [
      {
        label: "Import Excel",
        to: "/import-excel",
        icon: "mdi-file-excel-outline",
      },
      { label: "Cảnh báo tồn kho", to: "/alerts", icon: "mdi-alert-outline" },
      {
        label: "Nhân viên",
        to: "/employees",
        icon: "mdi-account-group-outline",
      },
      {
        label: "Nhân viên & phân quyền",
        to: "/users",
        icon: "mdi-account-cog-outline",
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
  <aside class="sidebar">
    <RouterLink to="/dashboard" class="brand">
      <span class="brand-mark">S</span>
      <span>
        <strong>SME StockSense</strong>
        <small>Quản lý tồn kho MVP</small>
      </span>
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
          >
            <i class="mdi" :class="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>
      </template>
    </nav>
    <div class="sidebar-note">
      <strong>Phạm vi hiện tại</strong>
      <span>CRUD kho, phiếu nhập/xuất, duyệt phiếu và import theo mẫu.</span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 260px;
  max-height: 100vh;
  overflow-y: auto;
  background: #0f172a;
  color: #e5e7eb;
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  z-index: 20;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #2563eb;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  font-size: 20px;
}
.brand strong {
  display: block;
  color: #fff;
  line-height: 20px;
}
.brand small {
  display: block;
  color: #94a3b8;
  margin-top: 2px;
}
.nav-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin-top: 22px;
}
.sidebar-heading {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding-left: 4px;
}
.sidebar-section {
  display: grid;
  gap: 8px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 12px 14px;
  border-radius: 12px;
  color: #cbd5e1;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.03);
  transition:
    background 180ms ease,
    transform 180ms ease,
    color 180ms ease;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  transform: translateX(1px);
}
.nav-item.router-link-active {
  background: #1d4ed8;
  color: #fff;
  box-shadow: inset 4px 0 0 0 #93c5fd;
}
.nav-item.router-link-active:hover {
  background: #1e40af;
}
.nav-item i {
  font-size: 20px;
  width: 24px;
  text-align: center;
}
.sidebar-note {
  margin-top: auto;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  display: grid;
  gap: 4px;
  color: #cbd5e1;
  line-height: 18px;
}
.sidebar-note strong {
  color: #fff;
}

@media (max-width: 1023px) {
  .sidebar {
    position: static;
    width: 100%;
    min-height: auto;
    padding: 14px 12px 10px;
  }
  .nav-list {
    margin-top: 16px;
  }
  .sidebar-section {
    gap: 8px;
  }
  .sidebar-note {
    display: none;
  }
}
</style>
