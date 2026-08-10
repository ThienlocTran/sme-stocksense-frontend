import axios from 'axios'
import { clearAuth, getAuthorizationHeader, getCurrentUser } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const API_TIMEOUT_MS = 15000

const profileClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getCurrentProfile() {
  const fallbackProfile = normalizeProfile(getCurrentUser())

  let lastError = null

  try {
    const endpoints = ['/api/employees/profile/me']
    const currentUser = getCurrentUser()

    for (const endpoint of endpoints) {
      try {
        const { data } = await profileClient.get(endpoint, {
          headers: getAuthorizationHeader(),
        })

        const normalized = normalizeProfile(data, fallbackProfile)
        if (hasProfileData(normalized)) {
          return normalized
        }
      } catch (error) {
        const normalizedError = normalizeProfileError(error, 'Phiên đăng nhập đã hết hạn.')

        if (normalizedError.status === 401) {
          clearAuth()
          throw normalizedError
        }

        lastError = normalizedError

        if (!error?.response) {
          break
        }

        if (error.response?.status === 404) {
          continue
        }

        if (error.response?.status && error.response.status < 500) {
          break
        }
      }
    }

    if (hasProfileData(fallbackProfile)) {
      return fallbackProfile
    }

    if (lastError) {
      throw lastError
    }

    return null
  } catch (error) {
    const normalizedError = normalizeProfileError(error, 'Không thể tải thông tin hồ sơ.')

    if (normalizedError.status === 401) {
      throw normalizedError
    }

    if (hasProfileData(fallbackProfile)) {
      return fallbackProfile
    }

    throw normalizedError
  }
}

export async function updateProfile(data) {
  try {
    const response = await profileClient.put('/api/employees/profile/me', data, {
      headers: getAuthorizationHeader(),
    })
    return normalizeProfile(response.data)
  } catch (error) {
    throw normalizeProfileError(error, 'Không thể cập nhật hồ sơ.')
  }
}

export async function uploadAvatar(file) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await profileClient.post('/api/employees/profile/me/avatar', formData, {
      headers: {
        ...getAuthorizationHeader(),
        'Content-Type': 'multipart/form-data',
      },
    })
    return normalizeProfile(response.data)
  } catch (error) {
    throw normalizeProfileError(error, 'Không thể tải lên ảnh đại diện.')
  }
}

function normalizeProfile(data = {}, fallback = {}) {
  return {
    id: data?.id ?? data?.employeeId ?? fallback?.id ?? fallback?.employeeId ?? null,
    employeeId: data?.employeeId ?? data?.id ?? fallback?.employeeId ?? fallback?.id ?? null,
    fullName: data?.fullName ?? fallback?.fullName ?? '',
    email: data?.email ?? fallback?.email ?? '',
    phone: data?.phone ?? fallback?.phone ?? '',
    role: data?.roleName ?? data?.role ?? data?.roleCode ?? fallback?.roleName ?? fallback?.role ?? fallback?.roleCode ?? '',
    roleCode: data?.roleCode ?? fallback?.roleCode ?? '',
    status: data?.status ?? fallback?.status ?? '',
    avatarUrl: data?.avatarUrl ?? fallback?.avatarUrl ?? null,
    gender: data?.gender ?? fallback?.gender ?? '',
    dateOfBirth: data?.dateOfBirth ?? fallback?.dateOfBirth ?? null,
  }
}

function hasProfileData(profile) {
  return Boolean(profile?.fullName || profile?.email || profile?.role || profile?.status || profile?.employeeId)
}

function normalizeProfileError(error, fallbackMessage) {
  if (error?.response?.status === 401) {
    clearAuth()
  }

  if (error?.response?.data) {
    return {
      status: error.response.status,
      message: error.response.data.message || fallbackMessage,
    }
  }

  return {
    status: error?.status || 0,
    message: error?.message || fallbackMessage,
  }
}
