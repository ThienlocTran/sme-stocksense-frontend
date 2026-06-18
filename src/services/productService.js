import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const productClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getProducts({ page = 0, size = 10, keyword = '', categoryId = '', status = '' } = {}) {
  try {
    const { data } = await productClient.get('/api/products', {
      headers: getAuthorizationHeader(),
      params: {
        page,
        size,
        keyword: keyword || undefined,
        danhMucId: categoryId || undefined,
        trangThai: status || undefined,
      },
    })
    return data
  } catch (error) {
    throw normalizeProductError(error, 'Không thể tải danh sách sản phẩm.')
  }
}

export async function getProduct(id) {
  try {
    const { data } = await productClient.get(`/api/products/${id}`, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeProductError(error, 'Không thể tải sản phẩm.')
  }
}

export async function createProduct(payload) {
  try {
    const { data } = await productClient.post('/api/products', payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeProductError(error, 'Không thể thêm sản phẩm.')
  }
}

export async function updateProduct(id, payload) {
  try {
    const { data } = await productClient.put(`/api/products/${id}`, payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeProductError(error, 'Không thể cập nhật sản phẩm.')
  }
}

export async function updateProductStatus(id, status) {
  try {
    const { data } = await productClient.patch(`/api/products/${id}/status`, { trangThai: status }, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeProductError(error, 'Không thể cập nhật trạng thái sản phẩm.')
  }
}

export async function getProductCategories() {
  try {
    const { data } = await productClient.get('/api/categories', {
      headers: getAuthorizationHeader(),
      params: { page: 0, size: 100, status: 'HOAT_DONG' },
    })
    return data.content || []
  } catch (error) {
    throw normalizeProductError(error, 'Không thể tải danh mục sản phẩm.')
  }
}

export async function getProductSuppliers() {
  try {
    const { data } = await productClient.get('/api/partners/dropdown/suppliers', {
      headers: getAuthorizationHeader(),
    })
    return data || []
  } catch (error) {
    throw normalizeProductError(error, 'Không thể tải danh sách nhà cung cấp.')
  }
}

function normalizeProductError(error, fallbackMessage) {
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
