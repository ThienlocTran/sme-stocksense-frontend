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
    throw normalizeEmployeeError(error, 'Không thể tải danh sách nhân viên.')
  }
}

export async function createEmployee(payload) {
  try {
    const { data } = await employeeClient.post('/api/employees', payload, {
      headers: getAuthorizationHeader(),
    })

    return data
  } catch (error) {
    throw normalizeEmployeeError(error, 'Không thể thêm nhân viên.')
  }
}

export async function updateEmployee(id, payload) {
  try {
    const { data } = await employeeClient.put(`/api/employees/${id}`, payload, {
      headers: getAuthorizationHeader(),
    })

    return data
  } catch (error) {
    throw normalizeEmployeeError(error, 'Không thể cập nhật nhân viên.')
  }
}

function normalizeEmployeeError(error, fallbackMessage) {
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
