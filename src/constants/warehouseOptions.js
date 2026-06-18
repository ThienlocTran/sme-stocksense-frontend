/**
 * Các tùy chọn trạng thái kho hàng.
 * Nghiệp vụ:
 * - Kho hàng chỉ nhận hai trạng thái: HOAT_DONG (Hoạt động) và NGUNG_HOAT_DONG (Ngừng hoạt động).
 * - Không xóa vật lý kho để bảo toàn dữ liệu lịch sử nhập/xuất/tồn kho.
 */
export const warehouseStatusOptions = [
  { value: 'HOAT_DONG', label: 'Đang hoạt động' },
  { value: 'NGUNG_HOAT_DONG', label: 'Ngừng hoạt động' },
]

export function getWarehouseStatusLabel(status) {
  return warehouseStatusOptions.find(option => option.value === status)?.label || status || '-'
}
