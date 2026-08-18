<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppSidebar from "./components/AppSidebar.vue";
import AppTopbar from "./components/AppTopbar.vue";
import GuidedTourOverlay from "./components/GuidedTourOverlay.vue";
import WelcomeModal from "./components/WelcomeModal.vue";
import { getCurrentUser } from "./services/authService";
import { canAccessRoute } from "./services/permissionService";
import { useAuthStore } from "./stores/auth";
import { useLayoutStore } from "./stores/layout";

const route = useRoute();
const authStore = useAuthStore();
const layoutStore = useLayoutStore();
const currentRole = computed(() => authStore.currentRole);
const isAuthLayout = computed(() => route.meta.layout === "auth");
const isWelcomeModalOpen = ref(false);
const isGuidedTourOpen = ref(false);

const WELCOME_MODAL_STORAGE_KEY = "stocksense_welcome_modal_seen";
const GUIDED_TOUR_STORAGE_KEY = "stocksense_guided_tour_seen";

function getStorageKey(baseKey) {
  const currentUser = getCurrentUser();
  const userId = currentUser?.employeeId || currentUser?.id || "guest";
  return `${baseKey}_${userId}`;
}

function shouldShowWelcomeModal() {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(getStorageKey(WELCOME_MODAL_STORAGE_KEY)) !==
    "true"
  );
}

function shouldShowGuidedTour() {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(getStorageKey(GUIDED_TOUR_STORAGE_KEY)) !==
    "true"
  );
}

function closeWelcomeModal(action = "dismiss") {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      getStorageKey(WELCOME_MODAL_STORAGE_KEY),
      "true",
    );
  }
  isWelcomeModalOpen.value = false;

  if (action === "start" && shouldShowGuidedTour()) {
    isGuidedTourOpen.value = true;
  } else if (action === "skip") {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        getStorageKey(GUIDED_TOUR_STORAGE_KEY),
        "true",
      );
    }
    isGuidedTourOpen.value = false;
  }
}

// Complete rewrite of close/skip guided tour
function closeGuidedTour() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getStorageKey(GUIDED_TOUR_STORAGE_KEY), "true");
  }
  isGuidedTourOpen.value = false;
}

function skipGuidedTour() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getStorageKey(GUIDED_TOUR_STORAGE_KEY), "true");
  }
  isGuidedTourOpen.value = false;
}

const guidedTourSteps = [
  {
    title: "Sidebar điều hướng",
    description:
      "Bắt đầu từ thanh bên để di chuyển nhanh giữa tổng quan, kho, phiếu nhập/xuất và cảnh báo.",
    selector: ".sidebar",
  },
  {
    title: "Dashboard tổng quan",
    description:
      "Tại đây bạn xem KPI, biểu đồ và các mục cần xử lý trong một bố cục mới dễ đọc hơn.",
    selector: ".dashboard-panel--wide",
  },
  {
    title: "Pending Approval",
    description:
      "Nhóm này giúp bạn thấy các phiếu nhập và xuất đang chờ duyệt trước khi vào màn hình chi tiết.",
    selector: ".attention-panel",
    permissionRoute: "/approvals",
  },
  {
    title: "Alerts",
    description: "Theo dõi các mặt hàng ở ngưỡng cảnh báo để xử lý kịp thời.",
    selector: ".attention-panel",
  },
  {
    title: "Inventory",
    description:
      "Mở màn hình tồn kho để lọc theo kho, trạng thái và tìm kiếm nhanh hơn.",
    route: "/inventory",
    selector: ".page-header",
  },
  {
    title: "Shortcut tạo phiếu",
    description:
      "Bạn có thể tạo phiếu nhập hoặc xuất nhanh từ các mục truy cập nhanh trên dashboard.",
    route: "/dashboard",
    selector: ".quick-link",
  },
  {
    title: "Filter",
    description:
      "Sử dụng bộ lọc để thu hẹp dữ liệu theo kho, trạng thái hoặc từ khóa trước khi làm việc.",
    route: "/inventory",
    selector: ".filter-bar",
  },
];

const visibleGuidedTourSteps = computed(() =>
  guidedTourSteps.filter((step) => {
    if (!step.permissionRoute) {
      return true;
    }

    return canAccessRoute(step.permissionRoute, currentRole.value);
  }),
);

onMounted(() => {
  if (!isAuthLayout.value && shouldShowWelcomeModal()) {
    isWelcomeModalOpen.value = true;
  } else if (!isAuthLayout.value && shouldShowGuidedTour()) {
    isGuidedTourOpen.value = true;
  }
});

watch(isAuthLayout, (newVal, oldVal) => {
  if (newVal === true) {
    isWelcomeModalOpen.value = false;
    isGuidedTourOpen.value = false;
    return;
  }

  if (oldVal === true && newVal === false) {
    if (shouldShowWelcomeModal()) {
      isWelcomeModalOpen.value = true;
    } else if (shouldShowGuidedTour()) {
      isGuidedTourOpen.value = true;
    }
  }
});

// Watch route changes to automatically close the mobile sidebar drawer
watch(
  () => route.path,
  () => {
    layoutStore.closeMobileSidebar();
  }
);

// Add/remove scroll locking on document body when mobile sidebar is open
watch(
  () => layoutStore.isMobileOpen,
  (isOpen) => {
    if (typeof document !== "undefined") {
      if (isOpen) {
        document.body.classList.add("overflow-hidden");
      } else {
        document.body.classList.remove("overflow-hidden");
      }
    }
  }
);
</script>

<template>
  <RouterView v-if="isAuthLayout" />
  <div v-else class="app-shell">
    <div
      v-if="layoutStore.isMobileOpen"
      class="sidebar-overlay"
      @click="layoutStore.closeMobileSidebar"
    ></div>

    <AppSidebar />
    <div class="app-main">
      <AppTopbar />
      <main class="page-shell">
        <RouterView />
      </main>
    </div>
    <WelcomeModal :open="isWelcomeModalOpen" @close="closeWelcomeModal" />
    <GuidedTourOverlay
      :open="isGuidedTourOpen"
      :steps="visibleGuidedTourSteps"
      @close="closeGuidedTour"
      @completed="closeGuidedTour"
      @skip="skipGuidedTour"
    />
  </div>
</template>
