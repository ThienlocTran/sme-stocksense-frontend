import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLayoutStore = defineStore('layout', () => {
  const isMobileOpen = ref(false)

  function toggleMobileSidebar() {
    isMobileOpen.value = !isMobileOpen.value
  }

  function closeMobileSidebar() {
    isMobileOpen.value = false
  }

  return {
    isMobileOpen,
    toggleMobileSidebar,
    closeMobileSidebar
  }
})
