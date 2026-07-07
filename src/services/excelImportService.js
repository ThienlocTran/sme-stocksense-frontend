import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const excelImportClient = axios.create({
  baseURL: API_BASE_URL,
})

/**
 * Tải file mẫu Excel (blob)
 * GET /api/excel-imports/template
 */
export async function downloadTemplate() {
  try {
    const response = await excelImportClient.get('/api/excel-imports/template', {
      headers: getAuthorizationHeader(),
      responseType: 'blob',
    })
    return response.data
  } catch (error) {
    throw normalizeExcelImportError(error, 'Không thể tải file mẫu Excel.')
  }
}

/**
 * Khởi tạo phiên import Excel
 * POST /api/excel-imports
 */
export async function createImportSession(file, loaiImport, warehouseId) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('loaiImport', loaiImport)
    if (warehouseId) {
      formData.append('khoId', warehouseId)
    }

    const { data } = await excelImportClient.post('/api/excel-imports', formData, {
      headers: {
        ...getAuthorizationHeader(),
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  } catch (error) {
    throw normalizeExcelImportError(error, 'Không thể khởi tạo phiên import Excel.')
  }
}

/**
 * Kiểm tra lỗi dữ liệu file Excel cho phiên import và lưu vào DB lỗi
 * POST /api/excel-imports/{id}/validate-errors
 */
export async function validateImportSession(id, file, loaiImport, warehouseId) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('loaiImport', loaiImport)
    if (warehouseId) {
      formData.append('khoId', warehouseId)
    }

    const { data } = await excelImportClient.post(`/api/excel-imports/${id}/validate-errors`, formData, {
      headers: {
        ...getAuthorizationHeader(),
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  } catch (error) {
    throw normalizeExcelImportError(error, 'Không thể xác thực file Excel.')
  }
}

/**
 * Lấy danh sách lỗi validation phân trang của phiên import
 * GET /api/excel-imports/{id}/errors
 */
export async function getSessionErrors(id, page = 0, size = 20) {
  try {
    const { data } = await excelImportClient.get(`/api/excel-imports/${id}/errors`, {
      headers: getAuthorizationHeader(),
      params: { page, size },
    })
    return data
  } catch (error) {
    throw normalizeExcelImportError(error, 'Không thể tải danh sách lỗi validation.')
  }
}

/**
 * Xác nhận phiên import đã sẵn sàng áp dụng
 * POST /api/excel-imports/{id}/confirm
 */
export async function confirmImportSession(id) {
  try {
    const { data } = await excelImportClient.post(`/api/excel-imports/${id}/confirm`, null, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeExcelImportError(error, 'Không thể xác nhận phiên import.')
  }
}

/**
 * Áp dụng dữ liệu từ file Excel vào DB chính thức
 * POST /api/excel-imports/{id}/apply
 */
export async function applyImportSession(id, file) {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await excelImportClient.post(`/api/excel-imports/${id}/apply`, formData, {
      headers: {
        ...getAuthorizationHeader(),
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  } catch (error) {
    throw normalizeExcelImportError(error, 'Không thể thực hiện import dữ liệu.')
  }
}

function normalizeExcelImportError(error, fallbackMessage) {
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
