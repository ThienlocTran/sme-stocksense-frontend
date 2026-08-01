<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import AppSidebar from "./components/AppSidebar.vue";
import AppTopbar from "./components/AppTopbar.vue";
import WelcomeModal from "./components/WelcomeModal.vue";

const route = useRoute();
const isAuthLayout = computed(() => route.meta.layout === "auth");
const isWelcomeModalOpen = ref(false);

const WELCOME_MODAL_STORAGE_KEY = "stocksense_welcome_modal_seen";

function shouldShowWelcomeModal() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(WELCOME_MODAL_STORAGE_KEY) !== "true";
}

function closeWelcomeModal() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(WELCOME_MODAL_STORAGE_KEY, "true");
  }
  isWelcomeModalOpen.value = false;
}

onMounted(() => {
  if (!isAuthLayout.value && shouldShowWelcomeModal()) {
    isWelcomeModalOpen.value = true;
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
  </div>
</template>
