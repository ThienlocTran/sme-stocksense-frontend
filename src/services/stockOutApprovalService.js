import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const exportReceiptClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

function normalizeId(id) {
  if (id === null || id === undefined || id === '') return ''

  const value = String(id).trim()
  if (/^\d+$/.test(value)) return value

  const match = value.match(/\d+/)
  return match ? match[0] : value
}

function normalizeStatus(status) {
  if (status === 'CHO_DUYET_CAP_1' || status === 'CHO_DUYET_CAP_2') return 'CHO_DUYET'
  if (status === 'HOAN_THANH') return 'DA_DUYET'
  return status
}

function normalizeApprovalLevel(value) {
  if (!value) return null

  const normalized = String(value).trim().toUpperCase()
  if (['LEVEL_1', 'CAP_1', 'CHO_DUYET_CAP_1'].includes(normalized)) return 'Cấp 1'
  if (['LEVEL_2', 'CAP_2', 'CHO_DUYET_CAP_2'].includes(normalized)) return 'Cấp 2'
  return value
}

function normalizeReceipt(receipt) {
  if (!receipt) return null

  return {
    ...receipt,
    id: receipt.id,
    code: receipt.code || '-',
    createdByName: receipt.createdByName || receipt.createdBy || '-',
    warehouseName: receipt.warehouseName || receipt.warehouse || '-',
    status: normalizeStatus(receipt.status),
    approvalLevel: receipt.approvalLevel,
    approvalLevelLabel: receipt.approvalLevelLabel || normalizeApprovalLevel(receipt.approvalLevel),
    createdAt: receipt.createdAt,
    submittedAt: receipt.submittedAt,
    items: (receipt.items || []).map((item) => ({
      ...item,
      productId: item.productId || item.id,
      productCode: item.productCode || item.code,
      productName: item.productName || item.name,
      unitName: item.unitName || item.unit || '-',
      exportQuantity: item.exportQuantity ?? item.quantity ?? 0,
      currentStock: item.currentStock ?? item.currentInventory ?? 0,
      warning: Boolean(item.warning),
    })),
  }
}

function normalizePageResponse(data) {
  return {
    content: (data.content || []).map(normalizeReceipt),
    totalElements: data.totalElements || 0,
    totalPages: data.totalPages || 0,
    page: data.page ?? 0,
    size: data.size ?? 10,
  }
}

function normalizeError(error, fallbackMessage) {
  const status = error.response?.status || 0
  const message = error.response?.data?.message || error.response?.data?.error || fallbackMessage

  if (status === 401) {
    clearAuth()
  }

  const normalizedError = new Error(message)
  normalizedError.status = status
  normalizedError.errors = error.response?.data?.errors || {}
  return normalizedError
}

export async function getPendingExportApprovals({ page = 0, size = 10 } = {}) {
  try {
    const { data } = await exportReceiptClient.get('/api/export-receipts/pending-approval', {
      headers: getAuthorizationHeader(),
      params: {
        page,
        size,
      },
    })

    return normalizePageResponse(data)
  } catch (error) {
    throw normalizeError(error, 'Không thể tải danh sách phiếu xuất chờ duyệt.')
  }
}

export async function getPendingExportApprovalDetail(id) {
  const normalizedId = normalizeId(id)

  try {
    const { data } = await exportReceiptClient.get(`/api/export-receipts/${normalizedId}`, {
      headers: getAuthorizationHeader(),
    })

    return normalizeReceipt(data)
  } catch (error) {
    throw normalizeError(error, 'Không thể tải chi tiết phiếu xuất.')
  }
}

export async function approveExportReceipt(id) {
  const normalizedId = normalizeId(id)

  try {
    const { data } = await exportReceiptClient.put(`/api/export-receipts/${normalizedId}/approve`, null, {
      headers: getAuthorizationHeader(),
    })

    return normalizeReceipt(data)
  } catch (error) {
    throw normalizeError(error, 'Không thể duyệt phiếu xuất.')
  }
}
