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
