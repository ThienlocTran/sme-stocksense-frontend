import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // Mặc định vai trò ban đầu là ADMIN để lập trình viên/người dùng trải nghiệm toàn bộ tính năng.
  // Có thể chuyển đổi vai trò ngay trên giao diện Header để kiểm thử phân quyền UI.
  const currentRole = ref(localStorage.getItem('user_role') || 'ADMIN')
  const token = ref(localStorage.getItem('token') || '')

  function setRole(role) {
    currentRole.value = role
    localStorage.setItem('user_role', role)
  }

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  return {
    currentRole,
    token,
    setRole,
    setToken
  }
})
