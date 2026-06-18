import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8083'

const warehouseClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Lấy danh sách kho hàng từ backend (API T40).
 * Nghiệp vụ:
 * - Hệ thống không xóa vật lý kho để bảo toàn lịch sử nhập/xuất/tồn kho — chỉ đổi trạng thái.
 * - Mã kho không được cho trùng và không cho phép sửa đổi để đảm bảo tính toàn vẹn dữ liệu.
 */
export async function getWarehouses({ keyword = '', status = '' } = {}) {
  try {
    const { data } = await warehouseClient.get('/api/warehouses', {
      headers: getAuthorizationHeader(),
      params: {
        keyword: keyword || undefined,
        status: status || undefined,
      },
    })
    return data
  } catch (error) {
    throw normalizeWarehouseError(error, 'Không thể tải danh sách kho hàng.')
  }
}

/**
 * Tạo mới kho hàng (API T41).
 * Nghiệp vụ:
 * - Mã kho (maKho) và Tên kho (tenKho) bắt buộc nhập.
 * - Mã kho không được trùng nhau trong hệ thống.
 */
export async function createWarehouse(payload) {
  try {
    const { data } = await warehouseClient.post('/api/warehouses', payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeWarehouseError(error, 'Không thể thêm kho hàng mới.')
  }
}

/**
 * Cập nhật thông tin kho hàng (API T42).
 * Nghiệp vụ:
 * - Không cho phép chỉnh sửa mã kho hàng (maKho) khi cập nhật để giữ tính nhất quán dữ liệu.
 * - Tên kho (tenKho) và Trạng thái (trangThai) bắt buộc nhập.
 */
export async function updateWarehouse(id, payload) {
  try {
    const { data } = await warehouseClient.put(`/api/warehouses/${id}`, payload, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeWarehouseError(error, 'Không thể cập nhật thông tin kho hàng.')
  }
}

function normalizeWarehouseError(error, fallbackMessage) {
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
