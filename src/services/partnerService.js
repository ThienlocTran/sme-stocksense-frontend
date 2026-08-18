import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const partnerClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getPartners({ keyword = '', loaiDoiTac = '', trangThai = '' } = {}) {
  try {
    const { data } = await partnerClient.get('/api/partners', {
      headers: getAuthorizationHeader(),
      params: {
        keyword: keyword || undefined,
        loaiDoiTac: loaiDoiTac || undefined,
        trangThai: trangThai || undefined,
      },
    })
    return data
  } catch (error) {
    throw normalizePartnerError(error, 'Không thể tải danh sách đối tác.')
  }
}

export async function createPartner(payload) {
  try {
    const { data } = await partnerClient.post('/api/partners', payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizePartnerError(error, 'Không thể thêm đối tác.')
  }
}

export async function updatePartner(id, payload) {
  try {
    const { data } = await partnerClient.put(`/api/partners/${id}`, payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizePartnerError(error, 'Không thể cập nhật đối tác.')
  }
}

function normalizePartnerError(error, fallbackMessage) {
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
