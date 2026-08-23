import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const alertClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * GET /api/inventory-alerts
 * Lấy danh sách cảnh báo tồn kho (có severity + status + acknowledgedAt).
 */
export async function getInventoryAlerts({
  page = 0,
  size = 20,
  warehouseId = '',
  productId = '',
  severity = '',
  status = '',
} = {}) {
  try {
    const { data } = await alertClient.get('/api/inventory-alerts', {
      headers: getAuthorizationHeader(),
      params: {
        page,
        size,
        warehouseId: warehouseId || undefined,
        productId: productId || undefined,
        severity: severity || undefined,
        status: status || undefined,
      },
    })
    return data
  } catch (error) {
    throw normalizeAlertError(error, 'Không thể tải danh sách cảnh báo tồn kho.')
  }
}

/**
 * PUT /api/inventory-alerts/{id}/acknowledge
 * Đánh dấu cảnh báo đã tiếp nhận / xử lý.
 */
export async function acknowledgeAlert(id) {
  try {
    const { data } = await alertClient.put(`/api/inventory-alerts/${id}/acknowledge`, null, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeAlertError(error, 'Không thể xác nhận cảnh báo.')
  }
}

function normalizeAlertError(error, fallbackMessage) {
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
    return { status, message: fallbackMessage, errors: {} }
  }

  return {
    status: 0,
    message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    errors: {},
  }
}
