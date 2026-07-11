import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { AUTH_STORAGE_KEYS, getAccessToken, getCurrentUser, normalizeRole, normalizeUserRole } from '../services/authService'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(getCurrentUser())
  const token = ref(getAccessToken() || '')
  const currentRole = computed(() => normalizeUserRole(currentUser.value))

  function syncFromStorage() {
    currentUser.value = getCurrentUser()
    token.value = getAccessToken() || ''
  }

  function setRole(role) {
    currentUser.value = {
      ...(currentUser.value || {}),
      role: normalizeRole(role),
    }
  }

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, newToken)
  }

  return {
    currentUser,
    currentRole,
    token,
    syncFromStorage,
    setRole,
    setToken
  }
})
