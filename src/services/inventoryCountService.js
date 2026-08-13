import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const inventoryCountClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getInventoryCounts({ page = 0, size = 20, warehouseId = '', status = '' } = {}) {
  try {
    const { data } = await inventoryCountClient.get('/api/inventory-counts', {
      headers: getAuthorizationHeader(),
      params: {
        page,
        size,
        warehouseId: warehouseId || undefined,
        status: status || undefined,
      },
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể tải danh sách kiểm kê kho.')
  }
}

export async function getInventoryCountById(id) {
  try {
    const { data } = await inventoryCountClient.get(`/api/inventory-counts/${id}`, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể tải thông tin chi tiết kiểm kê kho.')
  }
}

export async function createInventoryCount(payload) {
  try {
    const { data } = await inventoryCountClient.post('/api/inventory-counts', payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể tạo đợt kiểm kê kho.')
  }
}

export async function updateInventoryCountDetail(id, detailId, payload) {
  try {
    const { data } = await inventoryCountClient.put(`/api/inventory-counts/${id}/details/${detailId}`, payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể cập nhật số lượng thực tế.')
  }
}

export async function finalizeInventoryCount(id, payload) {
  try {
    const { data } = await inventoryCountClient.post(`/api/inventory-counts/${id}/finalize`, payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể chốt đợt kiểm kê kho.')
  }
}

export async function cancelInventoryCount(id, payload) {
  try {
    const { data } = await inventoryCountClient.post(`/api/inventory-counts/${id}/cancel`, payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeError(error, 'Không thể hủy đợt kiểm kê kho.')
  }
}

function normalizeError(error, fallbackMessage) {
  if (error.response?.status === 401) {
    clearAuth()
  }

  if (error.response?.status === 403) {
    return {
      status: 403,
      message: 'Bạn không có quyền thực hiện thao tác này.',
      errors: {},
    }
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
