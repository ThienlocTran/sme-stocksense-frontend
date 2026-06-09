import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export const AUTH_STORAGE_KEYS = {
  accessToken: 'stocksense_access_token',
  tokenType: 'stocksense_token_type',
  expiresIn: 'stocksense_expires_in',
  currentUser: 'stocksense_current_user',
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

export function getAccessToken() {
  return localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)
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

export function clearAuth() {
  Object.values(AUTH_STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
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
