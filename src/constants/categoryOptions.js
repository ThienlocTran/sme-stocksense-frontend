export const categoryStatusOptions = [
  { value: 'HOAT_DONG', label: 'Hoạt động' },
  { value: 'NGUNG_HOAT_DONG', label: 'Ngừng hoạt động' },
]

export function getCategoryStatusLabel(status) {
  return categoryStatusOptions.find(option => option.value === status)?.label || status || '-'
}
