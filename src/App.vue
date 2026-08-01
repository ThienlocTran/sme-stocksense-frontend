<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppSidebar from "./components/AppSidebar.vue";
import AppTopbar from "./components/AppTopbar.vue";
import GuidedTourOverlay from "./components/GuidedTourOverlay.vue";
import WelcomeModal from "./components/WelcomeModal.vue";
import { getCurrentUser } from "./services/authService";

const route = useRoute();
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

function closeWelcomeModal() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      getStorageKey(WELCOME_MODAL_STORAGE_KEY),
      "true",
    );
  }
  isWelcomeModalOpen.value = false;
  if (shouldShowGuidedTour()) {
    isGuidedTourOpen.value = true;
  }
}

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
    selector: ".dashboard-section-grid .card:nth-of-type(1)",
  },
  {
    title: "Alerts",
    description: "Theo dõi các mặt hàng ở ngưỡng cảnh báo để xử lý kịp thời.",
    selector: ".dashboard-section-grid .card:nth-of-type(2)",
  },
  {
    title: "Inventory",
    description:
      "Mở màn hình tồn kho để lọc theo kho, trạng thái và tìm kiếm nhanh hơn.",
    route: "/inventory",
    selector: ".table-wrap",
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

onMounted(() => {
  if (!isAuthLayout.value && shouldShowWelcomeModal()) {
    isWelcomeModalOpen.value = true;
  } else if (!isAuthLayout.value && shouldShowGuidedTour()) {
    isGuidedTourOpen.value = true;
  }
});

watch(isAuthLayout, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    if (shouldShowWelcomeModal()) {
      isWelcomeModalOpen.value = true;
    } else if (shouldShowGuidedTour()) {
      isGuidedTourOpen.value = true;
    }
  }
});
</script>

<template>
  <RouterView v-if="isAuthLayout" />
  <div v-else class="app-shell">
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
      :steps="guidedTourSteps"
      @close="closeGuidedTour"
      @completed="closeGuidedTour"
      @skip="skipGuidedTour"
    />
  </div>
</template>
