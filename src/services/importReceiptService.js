import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const importReceiptClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getMyImportReceipts({ page = 0, size = 10, status = '' } = {}) {
  try {
    const { data } = await importReceiptClient.get('/api/import-receipts/my', {
      headers: getAuthorizationHeader(),
      params: {
        page,
        size,
        status: status || undefined,
      },
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể tải danh sách phiếu nhập.')
  }
}

function normalizeImportReceiptError(error, fallbackMessage) {
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
