export const employeeRoleOptions = [
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'MANAGER', label: 'Quản lý kho' },
  { value: 'EMPLOYEE', label: 'Nhân viên kho' },
]

export const employeeStatusOptions = [
  { value: 'HOAT_DONG', label: 'Hoạt động' },
  { value: 'TAM_KHOA', label: 'Tạm khóa' },
  { value: 'NGUNG_HOAT_DONG', label: 'Ngừng hoạt động' },
]

export function getRoleLabel(roleCode, fallbackRoleName) {
  if (fallbackRoleName) return fallbackRoleName
  return employeeRoleOptions.find(option => option.value === roleCode)?.label || roleCode || '-'
}

export function getStatusLabel(status) {
  return employeeStatusOptions.find(option => option.value === status)?.label || status || '-'
}
