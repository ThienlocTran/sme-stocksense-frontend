import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const API_TIMEOUT_MS = 15000

const aiPurchaseAssignmentClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function createAiPurchaseAssignment(payload) {
  try {
    const { data } = await aiPurchaseAssignmentClient.post('/api/ai-purchase-assignments', payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeAiPurchaseAssignmentError(error, 'Không thể tạo phân công mua hàng.')
  }
}

export async function retryEmail(id) {
  try {
    const { data } = await aiPurchaseAssignmentClient.post(`/api/ai-purchase-assignments/${id}/retry-email`, null, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeAiPurchaseAssignmentError(error, 'Không thể gửi lại email thông báo.')
  }
}

function normalizeAiPurchaseAssignmentError(error, fallbackMessage) {
  const status = error.response?.status

  if (status === 401) {
    clearAuth()
  }

  if (error.response?.data) {
    return {
      status: status ?? 0,
      message: error.response.data.message || fallbackMessage,
      errors: error.response.data.errors || {},
    }
  }

  if (status) {
    return {
      status,
      message: fallbackMessage,
      errors: {},
    }
  }

  return {
    status: 0,
    message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    errors: {},
  }
}
