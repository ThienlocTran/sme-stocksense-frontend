import axios from "axios"
import { clearAuth, getAuthorizationHeader } from "./authService"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
const API_TIMEOUT_MS = 15000

const dashboardClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
})

const request = async (config, fallback) => {
  try {
    const { data } = await dashboardClient.request({
      ...config,
      headers: getAuthorizationHeader(),
    })
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

export const getDashboardOverview = () => request(
  { method: "get", url: "/api/dashboard/overview" }, 
  "Không thể tải dữ liệu dashboard.",
)

export const getInventoryMovement = (params) => request(
  { method: "get", url: "/api/dashboard/inventory-movement", params },
  "Không thể tải dữ liệu biến động kho.",
)

export const getStockHealth = () => request(
  { method: "get", url: "/api/dashboard/stock-health" },
  "Không thể tải dữ liệu tình trạng tồn kho.",
)

export const getWarehouseDistribution = () => request(
  { method: "get", url: "/api/dashboard/warehouse-distribution" },
  "Không thể tải dữ liệu phân bổ kho hàng.",
)
