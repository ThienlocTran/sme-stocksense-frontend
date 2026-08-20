import axios from 'axios'
import { getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const systemSettingClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getImportReceiptThreshold() {
  try {
    const { data } = await systemSettingClient.get('/api/system-settings/import-receipt-threshold', {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể tải cấu hình ngưỡng phê duyệt.')
  }
}

export async function updateImportReceiptThreshold(value) {
  try {
    const { data } = await systemSettingClient.put(
      '/api/system-settings/import-receipt-threshold',
      { value: String(value) },
      { headers: getAuthorizationHeader() }
    )
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể cập nhật cấu hình.')
  }
}

function normalizeError(error, fallbackMessage) {
  if (error.response?.data) {
    return {
      status: error.response.status,
      message: error.response.data.message || error.response.data.error || fallbackMessage,
    }
  }
  return {
    status: 0,
    message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
  }
}
