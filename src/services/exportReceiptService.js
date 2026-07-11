import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
})

const request = async (config, fallback) => {
  try {
    const { data } = await client.request({ ...config, headers: getAuthorizationHeader() })
    return data
  } catch (error) {
    if (error.response?.status === 401) clearAuth()
    throw {
      status: error.response?.status || 0,
      message: error.response?.data?.message || fallback,
      errors: error.response?.data?.errors || {},
    }
  }
}

export const createExportReceipt = payload => request({ method: 'post', url: '/api/export-receipts/draft', data: payload }, 'Không thể tạo phiếu xuất.')
export const updateExportReceipt = (id, payload) => request({ method: 'put', url: `/api/export-receipts/${id}/draft`, data: payload }, 'Không thể cập nhật phiếu xuất.')
export const getExportReceipt = id => request({ method: 'get', url: `/api/export-receipts/${id}` }, 'Không thể tải phiếu xuất.')
export const submitExportReceipt = (id, version) => request({ method: 'put', url: `/api/export-receipts/${id}/submit`, data: { version } }, 'Không thể gửi duyệt phiếu xuất.')
export const cancelExportReceipt = id => request({ method: 'delete', url: `/api/export-receipts/${id}/draft` }, 'Không thể hủy phiếu xuất.')
export const getAvailability = (id, productId) => request({ method: 'get', url: `/api/export-receipts/${id}/availability/${productId}` }, 'Không thể tải tồn khả dụng.')
export const getMyExportReceipts = ({ page = 0, size = 10, status = '' } = {}) => request({
  method: 'get', url: '/api/export-receipts/my', params: { page, size, status: status || undefined },
}, 'Không thể tải danh sách phiếu xuất.')
export const getPendingExportReceipts = ({ page = 0, size = 10, status = '' } = {}) => request({
  method: 'get', url: '/api/export-receipts/pending-approval', params: { page, size, status: status || undefined },
}, 'Không thể tải phiếu xuất chờ duyệt.')
export const approveExportReceipt = id => request({ method: 'put', url: `/api/export-receipts/${id}/approve` }, 'Không thể duyệt phiếu xuất.')
export const rejectExportReceipt = (id, reason) => request({
  method: 'put', url: `/api/export-receipts/${id}/reject`, data: { rejectReason: reason },
}, 'Không thể từ chối phiếu xuất.')
export const getExportReceiptHistory = id => request({
  method: 'get', url: `/api/export-receipts/${id}/history`,
}, 'Không thể tải lịch sử phiếu xuất.')
