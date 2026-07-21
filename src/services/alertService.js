import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const alertClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getAlerts({ page = 0, size = 20, keyword = '', warehouseId = '', severity = '', status = '' } = {}) {
  try {
    const { data } = await alertClient.get('/api/alerts', {
      headers: getAuthorizationHeader(),
      params: {
        page,
        size,
        keyword: keyword || undefined,
        warehouseId: warehouseId || undefined,
        severity: severity || undefined,
        status: status || undefined,
      },
    })
    return data
  } catch (error) {
    throw normalizeAlertError(error, 'Không thể tải danh sách cảnh báo.')
  }
}

function normalizeAlertError(error, fallbackMessage) {
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
