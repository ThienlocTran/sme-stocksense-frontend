import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const inventoryClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getInventory({ page = 0, size = 20, keyword = '', warehouseId = '', productId = '', stockStatus = '', warehouseStatus = '', productStatus = '' } = {}) {
  try {
    const { data } = await inventoryClient.get('/api/inventory', {
      headers: getAuthorizationHeader(),
      params: {
        page,
        size,
        keyword: keyword || undefined,
        warehouseId: warehouseId || undefined,
        productId: productId || undefined,
        status: stockStatus || undefined,
        warehouseStatus: warehouseStatus || undefined,
        productStatus: productStatus || undefined,
      },
    })
    return data
  } catch (error) {
    throw normalizeInventoryError(error, 'Không thể tải danh sách tồn kho.')
  }
}

export async function getLowStockInventory({ page = 0, size = 20, keyword = '', warehouseId = '', productId = '', warehouseStatus = '', productStatus = '' } = {}) {
  try {
    const { data } = await inventoryClient.get('/api/inventory/low-stock', {
      headers: getAuthorizationHeader(),
      params: {
        page,
        size,
        keyword: keyword || undefined,
        warehouseId: warehouseId || undefined,
        productId: productId || undefined,
        warehouseStatus: warehouseStatus || undefined,
        productStatus: productStatus || undefined,
      },
    })
    return data
  } catch (error) {
    throw normalizeInventoryError(error, 'Không thể tải danh sách tồn kho thấp.')
  }
}

function normalizeInventoryError(error, fallbackMessage) {
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
