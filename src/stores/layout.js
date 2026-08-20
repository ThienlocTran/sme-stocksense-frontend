import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLayoutStore = defineStore('layout', () => {
  const isMobileOpen = ref(false)
  const theme = ref(localStorage.getItem('stocksense-theme') || localStorage.getItem('stocksense_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))

  function toggleMobileSidebar() {
    isMobileOpen.value = !isMobileOpen.value
  }

  function closeMobileSidebar() {
    isMobileOpen.value = false
  }

  function setTheme(newTheme) {
    theme.value = newTheme
    localStorage.setItem('stocksense-theme', newTheme)
    localStorage.setItem('stocksense_theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    isMobileOpen,
    toggleMobileSidebar,
    closeMobileSidebar,
    theme,
    setTheme,
    toggleTheme
  }
})
