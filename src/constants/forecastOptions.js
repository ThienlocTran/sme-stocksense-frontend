/**
 * Chế độ tính toán ra kết quả dự báo: XGBOOST (đủ dữ liệu) hoặc COLD_START_AVG (thiếu dữ liệu, dùng trung bình động).
 */
export const forecastModeOptions = [
  { value: 'XGBOOST', label: 'XGBoost' },
  { value: 'COLD_START_AVG', label: 'Trung bình động (thiếu dữ liệu)' },
]

export function getForecastModeLabel(mode) {
  return forecastModeOptions.find(option => option.value === mode)?.label || mode || '-'
}

/**
 * Trạng thái kiểm tra lệch mô hình (drift) so với thực tế xuất kho.
 */
export const driftStatusOptions = [
  { value: 'OK', label: 'Ổn định' },
  { value: 'DRIFT', label: 'Lệch - cần train lại' },
  { value: 'NO_FORECAST_DATA', label: 'Chưa có dự báo để so sánh' },
  { value: 'NO_ACTUAL_DATA', label: 'Chưa có dữ liệu xuất kho thực tế' },
  { value: 'INSUFFICIENT_OVERLAP', label: 'Chưa đủ dữ liệu trùng ngày để so sánh' },
]

export function getDriftStatusLabel(status) {
  return driftStatusOptions.find(option => option.value === status)?.label || status || '-'
}
