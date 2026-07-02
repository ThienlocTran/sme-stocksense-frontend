/**
 * Các tùy chọn trạng thái kho hàng.
 * Kho hàng chỉ nhận hai trạng thái: HOAT_DONG và NGUNG_HOAT_DONG.
 */
export const warehouseStatusOptions = [
  { value: 'HOAT_DONG', label: 'Đang hoạt động' },
  { value: 'NGUNG_HOAT_DONG', label: 'Ngừng hoạt động' },
]

export function getWarehouseStatusLabel(status) {
  return warehouseStatusOptions.find(option => option.value === status)?.label || status || '-'
}
