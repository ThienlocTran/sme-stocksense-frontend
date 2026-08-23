import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const API_TIMEOUT_MS = 15000

const replenishmentClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getReplenishmentSuggestions({ page = 0, size = 20, keyword = '', warehouseId = '' } = {}) {
  try {
    const { data } = await replenishmentClient.get('/api/replenishment-suggestions', {
      headers: getAuthorizationHeader(),
      params: {
        page,
        size,
        keyword: keyword || undefined,
        warehouseId: warehouseId || undefined,
      },
    })

    return data
  } catch (error) {
    throw normalizeReplenishmentError(error, 'Không thể tải danh sách đề xuất bổ sung tồn kho.')
  }
}

export async function getReplenishmentRecommendation(productId, warehouseId, horizonDays, source) {
  try {
    const { data } = await replenishmentClient.get('/api/replenishment-suggestions/recommendation', {
      headers: getAuthorizationHeader(),
      params: {
        productId,
        warehouseId,
        horizonDays,
        source: source || undefined,
      },
    })
    return data
  } catch (error) {
    throw normalizeReplenishmentError(error, 'Không thể tải đề xuất bổ sung hàng.')
  }
}

function normalizeReplenishmentError(error, fallbackMessage) {
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
