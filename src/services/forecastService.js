import axios from 'axios'
import { clearAuth, getAuthorizationHeader } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
// Chạy XGBoost đồng bộ có thể mất vài chục giây khi đủ dữ liệu, nên timeout dài hơn các service khác.
const API_TIMEOUT_MS = 45000

const forecastClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

/** Chạy/train lại dự báo đồng bộ cho 1 sản phẩm/kho. */
export async function runForecast(productId, warehouseId) {
  try {
    const { data } = await forecastClient.post(`/api/forecast/${productId}/${warehouseId}`, null, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeForecastError(error, 'Không thể chạy dự báo AI.')
  }
}

/** Lấy kết quả dự báo mới nhất đã lưu, không train lại.
 *  Trả null khi SP/Kho chưa từng chạy dự báo (204 No Content). */
export async function getForecast(productId, warehouseId) {
  try {
    const response = await forecastClient.get(`/api/forecast/${productId}/${warehouseId}`, {
      headers: getAuthorizationHeader(),
    })
    return response.status === 204 ? null : response.data
  } catch (error) {
    throw normalizeForecastError(error, 'Không thể tải dự báo AI.')
  }
}

/** So sánh dự báo đã lưu với thực tế xuất kho gần đây để phát hiện lệch mô hình. */
export async function checkDrift(productId, warehouseId) {
  try {
    const { data } = await forecastClient.get(`/api/forecast/${productId}/${warehouseId}/drift`, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeForecastError(error, 'Không thể kiểm tra độ lệch mô hình.')
  }
}

/** Lấy danh sách sản phẩm/kho khả dụng cho nguồn dữ liệu dự báo. */
export async function getForecastAvailability(source) {
  try {
    const { data } = await forecastClient.get('/api/forecasts/availability', {
      headers: getAuthorizationHeader(),
      params: { source },
    })
    return data
  } catch (error) {
    throw normalizeForecastError(error, 'Không thể tải danh sách sản phẩm/kho khả dụng.')
  }
}

/** Sinh dữ liệu demo lịch sử bán hàng. */
export async function seedDemoHistory() {
  try {
    const { data } = await forecastClient.post('/api/forecast/seed-history', null, {
      headers: getAuthorizationHeader(),
    })
    return data
  } catch (error) {
    throw normalizeForecastError(error, 'Không thể sinh dữ liệu demo.')
  }
}


function normalizeForecastError(error, fallbackMessage) {
  const status = error.response?.status

  if (status === 401) {
    clearAuth()
  }

  if (error.response?.data) {
    return {
      status: status ?? 0,
      message: error.response.data.message || fallbackMessage,
      errors: error.response.data.errors || {},
    }
  }

  if (status) {
    return {
      status,
      message: fallbackMessage,
      errors: {},
    }
  }

  return {
    status: 0,
    message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    errors: {},
  }
}
