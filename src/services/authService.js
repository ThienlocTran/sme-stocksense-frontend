import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8083'

export const AUTH_STORAGE_KEYS = {
  accessToken: 'stocksense_access_token',
  tokenType: 'stocksense_token_type',
  expiresIn: 'stocksense_expires_in',
  loginAt: 'stocksense_login_at',
  currentUser: 'stocksense_current_user',
}

export const AUTH_ROLE_LABELS = {
  ADMIN: 'Admin / IT',
  MANAGER: 'Quản lý kho',
  EMPLOYEE: 'Nhân viên kho',
}

const AUTH_ROLE_CODES = {
  'Admin / IT': 'ADMIN',
  'Quản lý kho': 'MANAGER',
  'Nhân viên kho': 'EMPLOYEE',
}

const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function login(email, password) {
  try {
    const { data } = await authClient.post('/api/auth/login', { email, password })
    storeAuth(data)
    return data
  } catch (error) {
    throw normalizeLoginError(error)
  }
}

export async function changeOwnPassword(payload) {
  try {
    const { data } = await authClient.patch('/api/auth/change-password', payload, {
      headers: getAuthorizationHeader(),
    })

    return data
  } catch (error) {
    throw normalizeAuthError(error, 'Không thể đổi mật khẩu.')
  }
}

export function getAccessToken() {
  return localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)
}

export function isAuthenticated() {
  const accessToken = getAccessToken()
  const currentUser = getCurrentUser()
  if (!accessToken || !currentUser) {
    if (accessToken || currentUser) clearAuth()
    return false
  }

  const expiresIn = Number(localStorage.getItem(AUTH_STORAGE_KEYS.expiresIn))
  const loginAt = Number(localStorage.getItem(AUTH_STORAGE_KEYS.loginAt))
  if (expiresIn > 0 && loginAt > 0 && Date.now() > loginAt + expiresIn * 1000) {
    clearAuth()
    return false
  }

  return true
}

export function getCurrentUser() {
  const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.currentUser)
  if (!storedUser) return null

  try {
    return JSON.parse(storedUser)
  } catch {
    clearAuth()
    return null
  }
}

export function getAuthorizationHeader() {
  const accessToken = getAccessToken()
  const tokenType = localStorage.getItem(AUTH_STORAGE_KEYS.tokenType) || 'Bearer'
  return accessToken ? { Authorization: `${tokenType} ${accessToken}` } : {}
}

export function getCurrentRoleCode() {
  return normalizeRole(getCurrentUser()?.role)
}

export function getCurrentRoleLabel() {
  const roleCode = getCurrentRoleCode()
  return AUTH_ROLE_LABELS[roleCode] || roleCode || ''
}

export function formatRole(role) {
  const roleCode = normalizeRole(role)
  return AUTH_ROLE_LABELS[roleCode] || role || ''
}

export function clearAuth() {
  Object.values(AUTH_STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
  localStorage.removeItem('stocksense-demo-role')
  localStorage.removeItem('user_role')
  localStorage.removeItem('token')
}

function normalizeRole(role) {
  return AUTH_ROLE_CODES[role] || role || ''
}

function storeAuth(response) {
  const currentUser = {
    employeeId: response.employeeId,
    fullName: response.fullName,
    email: response.email,
    role: response.role,
    status: response.status,
  }

  localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, response.accessToken)
  localStorage.setItem(AUTH_STORAGE_KEYS.tokenType, response.tokenType)
  localStorage.setItem(AUTH_STORAGE_KEYS.expiresIn, String(response.expiresIn))
  localStorage.setItem(AUTH_STORAGE_KEYS.loginAt, String(Date.now()))
  localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify(currentUser))
}

function normalizeLoginError(error) {
  if (error.response?.data) {
    return {
      status: error.response.status,
      message: error.response.data.message || 'Đăng nhập không thành công.',
      errors: error.response.data.errors || {},
    }
  }

  return {
    status: 0,
    message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    errors: {},
  }
}

function normalizeAuthError(error, fallbackMessage) {
  if (error.response?.status === 401) {
    clearAuth()
  }

  if (error.response?.data) {
    return {
      status: error.response.status,
      message: error.response.data.message || fallbackMessage,
      errors: error.response.data.errors || {},
    }
  }

  return {
    status: 0,
    message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    errors: {},
  }
}
