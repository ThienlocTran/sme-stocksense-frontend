import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const employeeClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getEmployees({ page = 0, size = 10, keyword = '', status = '', roleCode = '' } = {}) {
  try {
    const { data } = await employeeClient.get('/api/employees', {
      headers: getAuthorizationHeader(),
      params: {
        page,
        size,
        keyword: keyword || undefined,
        status: status || undefined,
        roleCode: roleCode || undefined,
      },
    })

    return data
  } catch (error) {
    throw normalizeEmployeeError(error)
  }
}

function normalizeEmployeeError(error) {
  if (error.response?.status === 401) {
    clearAuth()
  }

  if (error.response?.data) {
    return {
      status: error.response.status,
      message: error.response.data.message || 'Không thể tải danh sách nhân viên.',
      errors: error.response.data.errors || {},
    }
  }

  return {
    status: 0,
    message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    errors: {},
  }
}
