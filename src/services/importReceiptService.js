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

export async function createImportReceipt(payload) {
  try {
    const { data } = await importReceiptClient.post('/api/import-receipts', payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể tạo phiếu nhập.')
  }
}

export async function saveDraft(receiptId, payload) {
  try {
    const { data } = await importReceiptClient.put(`/api/import-receipts/${receiptId}/draft`, payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể lưu phiếu nhập.')
  }
}

export async function updateEditable(receiptId, payload) {
  try {
    const { data } = await importReceiptClient.put(`/api/import-receipts/${receiptId}`, payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể lưu thay đổi phiếu nhập.')
  }
}

export async function submitForApproval(receiptId) {
  try {
    const { data } = await importReceiptClient.put(`/api/import-receipts/${receiptId}/submit`, null, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể gửi duyệt phiếu nhập.')
  }
}

export async function cancelDraft(receiptId) {
  try {
    const { data } = await importReceiptClient.put(`/api/import-receipts/${receiptId}/cancel`, null, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể hủy phiếu nhập.')
  }
}

export async function getDetail(receiptId) {
  try {
    const { data } = await importReceiptClient.get(`/api/import-receipts/${receiptId}`, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể tải thông tin phiếu nhập.')
  }
}

export async function confirmArrival(receiptId) {
  try {
    const { data } = await importReceiptClient.put(`/api/import-receipts/${receiptId}/arrival`, null, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể xác nhận hàng về.')
  }
}

export async function inspectReceipt(receiptId, payload) {
  try {
    const { data } = await importReceiptClient.put(`/api/import-receipts/${receiptId}/inspect`, payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể lưu kết quả kiểm hàng.')
  }
}

export async function createDiscrepancyReport(receiptId, payload) {
  try {
    const { data } = await importReceiptClient.post(`/api/import-receipts/${receiptId}/discrepancy-report`, payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể lập biên bản chênh lệch.')
  }
}

export async function completeImport(receiptId, payload) {
  try {
    const { data } = await importReceiptClient.put(`/api/import-receipts/${receiptId}/hoan-tat`, payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể hoàn tất phiếu nhập.')
  }
}

export async function getWarehouses() {
  try {
    const { data } = await importReceiptClient.get('/api/warehouses', {
      headers: getAuthorizationHeader(),
      params: { status: 'HOAT_DONG' },
    })
    return data || []
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể tải danh sách kho.')
  }
}

export async function getSuppliers() {
  try {
    const { data } = await importReceiptClient.get('/api/partners/dropdown/suppliers', {
      headers: getAuthorizationHeader(),
    })
    return data || []
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể tải danh sách nhà cung cấp.')
  }
}

export async function getProducts() {
  try {
    const { data } = await importReceiptClient.get('/api/products', {
      headers: getAuthorizationHeader(),
      params: { page: 0, size: 1000, trangThai: 'HOAT_DONG' },
    })
    return data.content || []
  } catch (error) {
    throw normalizeImportReceiptError(error, 'Không thể tải danh sách sản phẩm.')
  }
}

function normalizeImportReceiptError(error, fallbackMessage) {
  if (error.response?.status === 401) {
    clearAuth()
  }

  if (error.response?.data) {
    const status = error.response.status
    return {
      status,
      message: friendlyImportReceiptErrorMessage(status, fallbackMessage),
      errors: error.response.data.errors || {},
    }
  }

  return {
    status: 0,
    message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    errors: {},
  }
}

function friendlyImportReceiptErrorMessage(status, fallbackMessage) {
  if (status === 401) return 'Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (status === 404) return 'Phiếu nhập không tồn tại.'
  if (status === 409) return 'Trạng thái phiếu không còn hợp lệ hoặc dữ liệu chưa đủ điều kiện.'
  if (status === 400) return 'Vui lòng kiểm tra lại dữ liệu.'
  return fallbackMessage || 'Thao tác thất bại, vui lòng thử lại.'
}
