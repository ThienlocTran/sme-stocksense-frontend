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
    throw normalizeImportReceiptError(error, 'KhÃ´ng thá»ƒ lÆ°u thay Ä‘á»•i phiáº¿u nháº­p.')
  }
}

export async function submitForApproval(receiptId) {
  try {
    const { data } = await importReceiptClient.put(`/api/import-receipts/${receiptId}/submit`, null, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'KhÃ´ng thá»ƒ gá»­i duyá»‡t phiáº¿u nháº­p.')
  }
}

export async function cancelDraft(receiptId) {
  try {
    const { data } = await importReceiptClient.put(`/api/import-receipts/${receiptId}/cancel`, null, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'KhÃ´ng thá»ƒ há»§y phiáº¿u nháº­p.')
  }
}

export async function getDetail(receiptId) {
  try {
    const { data } = await importReceiptClient.get(`/api/import-receipts/${receiptId}`, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeImportReceiptError(error, 'KhÃ´ng thá»ƒ táº£i thÃ´ng tin phiáº¿u nháº­p.')
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
  if (status === 401) return 'Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.'
  if (status === 403) return 'Báº¡n khÃ´ng cÃ³ quyá»n thá»±c hiá»‡n thao tÃ¡c nÃ y.'
  if (status === 404) return 'Phiáº¿u nháº­p khÃ´ng tá»“n táº¡i.'
  if (status === 409) return 'Tráº¡ng thÃ¡i phiáº¿u khÃ´ng cÃ²n há»£p lá»‡ hoáº·c dá»¯ liá»‡u chÆ°a Ä‘á»§ Ä‘iá»u kiá»‡n.'
  if (status === 400) return 'Vui lÃ²ng kiá»ƒm tra láº¡i dá»¯ liá»‡u.'
  return fallbackMessage || 'Thao tÃ¡c tháº¥t báº¡i, vui lÃ²ng thá»­ láº¡i.'
}
