import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AUTH_STORAGE_KEYS, getAccessToken, getCurrentRoleCode } from '../services/authService'

export const useAuthStore = defineStore('auth', () => {
  const currentRole = ref(getCurrentRoleCode())
  const token = ref(getAccessToken() || '')

  function syncFromStorage() {
    currentRole.value = getCurrentRoleCode()
    token.value = getAccessToken() || ''
  }

  function setRole(role) {
    currentRole.value = role
  }

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, newToken)
  }

  return {
    currentRole,
    token,
    syncFromStorage,
    setRole,
    setToken
  }
})
