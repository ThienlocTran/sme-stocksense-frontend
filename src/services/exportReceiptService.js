import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const exportReceiptClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Lấy danh sách phiếu xuất của nhân viên đang đăng nhập (T119)
export async function getMyExportReceipts({ page = 0, size = 10, status = '' } = {}) {
  try {
    const { data } = await exportReceiptClient.get('/api/v1/export-receipts/my', {
      headers: getAuthorizationHeader(),
      params: { page, size, status: status || undefined },
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể tải danh sách phiếu xuất của tôi.')
  }
}

// Lấy toàn bộ danh sách phiếu xuất (Dành cho Quản lý/Admin) (T119)
export async function getExportReceipts({ page = 0, size = 10, status = '' } = {}) {
  try {
    const { data } = await exportReceiptClient.get('/api/v1/export-receipts', {
      headers: getAuthorizationHeader(),
      params: { page, size, status: status || undefined },
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể tải danh sách phiếu xuất.')
  }
}

// Hủy phiếu xuất nháp (T117)
export async function cancelDraft(receiptId) {
  try {
    const { data } = await exportReceiptClient.delete(`/api/v1/export-receipts/${receiptId}/draft`, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể hủy phiếu xuất.')
  }
}

// Gửi duyệt phiếu xuất (T118)
export async function submitForApproval(receiptId, payload) {
  try {
    // Note: API yêu cầu truyền request body, có thể chứa version để check Optimistic Lock
    const { data } = await exportReceiptClient.put(`/api/v1/export-receipts/${receiptId}/submit`, payload || {}, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể gửi duyệt phiếu xuất.')
  }
}

// Lấy chi tiết phiếu xuất (T120)
export async function getExportReceiptDetails(receiptId) {
  try {
    const { data } = await exportReceiptClient.get(`/api/v1/export-receipts/${receiptId}`, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể tải chi tiết phiếu xuất.')
  }
}

// Tạo phiếu xuất nháp mới (T122)
export async function createDraft(payload) {
  try {
    const { data } = await exportReceiptClient.post('/api/v1/export-receipts/draft', payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể tạo phiếu xuất nháp.')
  }
}

// Cập nhật phiếu xuất nháp (T122)
export async function updateDraft(receiptId, payload) {
  try {
    const { data } = await exportReceiptClient.put(`/api/v1/export-receipts/${receiptId}/draft`, payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể cập nhật phiếu xuất.')
  }
}

// Hàm chuẩn hóa lỗi trả về để UI dễ hiển thị
function normalizeError(error, fallbackMessage) {
  if (error.response?.status === 401) {
    clearAuth()
  }

  if (error.response?.data) {
    const status = error.response.status
    const serverMessage = error.response.data.message || error.response.data.error
    return {
      status,
      message: serverMessage || fallbackMessage,
      errors: error.response.data.errors || {},
    }
  }

  return {
    status: 0,
    message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    errors: {},
  }
}
