import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const adjustmentClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function createAdjustment(countId) {
  try {
    const { data } = await adjustmentClient.post(`/api/inventory-counts/${countId}/adjustment`, {}, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể lập phiếu điều chỉnh tồn kho.')
  }
}

export async function getAdjustmentByCount(countId) {
  try {
    const { data } = await adjustmentClient.get(`/api/inventory-counts/${countId}/adjustment`, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể tải thông tin phiếu điều chỉnh từ đợt kiểm kê.')
  }
}

export async function getAdjustment(adjustmentId) {
  try {
    const { data } = await adjustmentClient.get(`/api/inventory-adjustments/${adjustmentId}`, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể tải thông tin phiếu điều chỉnh.')
  }
}

export async function submitAdjustment(adjustmentId) {
  try {
    const { data } = await adjustmentClient.post(`/api/inventory-adjustments/${adjustmentId}/submit`, {}, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể nộp phiếu điều chỉnh.')
  }
}

export async function approveAdjustment(adjustmentId) {
  try {
    const { data } = await adjustmentClient.post(`/api/inventory-adjustments/${adjustmentId}/approve`, {}, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể duyệt phiếu điều chỉnh.')
  }
}

export async function rejectAdjustment(adjustmentId, request) {
  try {
    const { data } = await adjustmentClient.post(`/api/inventory-adjustments/${adjustmentId}/reject`, request, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể từ chối phiếu điều chỉnh.')
  }
}

export async function applyAdjustment(adjustmentId) {
  try {
    const { data } = await adjustmentClient.post(`/api/inventory-adjustments/${adjustmentId}/apply`, {}, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể áp dụng điều chỉnh.')
  }
}

function normalizeError(error, fallbackMessage) {
  if (error.response?.status === 401) {
    clearAuth()
  }

  if (error.response?.status === 403) {
    return {
      status: 403,
      message: 'Bạn không có quyền thực hiện thao tác này.',
      errors: {},
    }
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
