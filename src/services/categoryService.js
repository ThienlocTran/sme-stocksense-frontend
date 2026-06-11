import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const categoryClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getCategories({ page = 0, size = 10, keyword = '', status = '' } = {}) {
  try {
    const { data } = await categoryClient.get('/api/categories', {
      headers: getAuthorizationHeader(),
      params: {
        page,
        size,
        keyword: keyword || undefined,
        status: status || undefined,
      },
    })

    return data
  } catch (error) {
    throw normalizeCategoryError(error, 'Không thể tải danh sách danh mục.')
  }
}

export async function createCategory(payload) {
  try {
    const { data } = await categoryClient.post('/api/categories', payload, {
      headers: getAuthorizationHeader(),
    })

    return data
  } catch (error) {
    throw normalizeCategoryError(error, 'Không thể thêm danh mục.')
  }
}

export async function updateCategory(id, payload) {
  try {
    const { data } = await categoryClient.put(`/api/categories/${id}`, payload, {
      headers: getAuthorizationHeader(),
    })

    return data
  } catch (error) {
    throw normalizeCategoryError(error, 'Không thể cập nhật danh mục.')
  }
}

function normalizeCategoryError(error, fallbackMessage) {
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
