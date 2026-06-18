<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AppTopbar from './components/AppTopbar.vue'

const route = useRoute()
const isAuthLayout = computed(() => route.meta.layout === 'auth')
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
  </div>
</template>
