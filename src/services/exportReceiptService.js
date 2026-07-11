import axios from 'axios'
import { clearAuth, getAuthorizationHeader, getCurrentRoleCode } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const exportReceiptClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getPendingExportApprovals({ page = 0, size = 10 } = {}) {
  try {
    const currentRole = getCurrentRoleCode()
    if (currentRole !== 'ADMIN' && currentRole !== 'MANAGER') {
      throw { status: 403, message: 'Bạn không có quyền xem danh sách phiếu xuất chờ duyệt.', errors: {} }
    }

    // TODO: Replace mock service with T143 API after merge.
    return await mockPendingExportApprovals(page, size)
  } catch (error) {
    throw normalizeExportReceiptError(error, 'Không thể tải danh sách phiếu xuất chờ duyệt.')
  }
}

function mockPendingExportApprovals(page, size) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const content = Array.from({ length: Math.min(size, 5) }, (_, index) => ({
        id: `EX-${1000 + page * size + index}`,
        code: `PX-${String(1000 + page * size + index).padStart(4, '0')}`,
        createdByName: index % 2 === 0 ? 'Nguyễn Minh Hòa' : 'Trần Thị Lan',
        warehouseName: index % 2 === 0 ? 'Kho trung tâm' : 'Kho miền Nam',
        submittedAt: '2026-07-10T08:30:00',
        status: 'Chờ duyệt',
        approvalLevel: index % 2 === 0 ? 'Cấp 1' : 'Cấp 2',
      }))

      resolve({
        content,
        totalPages: 3,
        totalElements: 13,
        page,
      })
    }, 400)
  })
}

function normalizeExportReceiptError(error, fallbackMessage) {
  const status = error?.status ?? error?.response?.status ?? 0
  const message = error?.message || error?.response?.data?.message || fallbackMessage
  const errors = error?.errors || error?.response?.data?.errors || {}

  if (status === 401) {
    clearAuth()
  }

  return {
    status,
    message: status === 0 ? 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.' : message,
    errors,
  }
}
