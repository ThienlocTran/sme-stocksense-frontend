import { getCurrentRoleCode, normalizeRole } from './authService'

const MASTER_DATA_MANAGE_ROLES = ['ADMIN', 'MANAGER']
const MASTER_DATA_VIEW_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE']
const IMPORT_RECEIPT_PROCESS_ROLES = ['ADMIN', 'EMPLOYEE']
const EMPLOYEE_MANAGE_ROLES = ['ADMIN']
const EXCEL_IMPORT_ROLES = ['ADMIN', 'EMPLOYEE']

function resolveRole(role) {
  return normalizeRole(role) || getCurrentRoleCode()
}

export function canViewMasterData(role) {
  return MASTER_DATA_VIEW_ROLES.includes(resolveRole(role))
}

export function canManageCategories(role) {
  return MASTER_DATA_MANAGE_ROLES.includes(resolveRole(role))
}

export function canManageProducts(role) {
  return MASTER_DATA_MANAGE_ROLES.includes(resolveRole(role))
}

export function canManageWarehouses(role) {
  return MASTER_DATA_MANAGE_ROLES.includes(resolveRole(role))
}

export function canProcessImportReceipt(role) {
  return IMPORT_RECEIPT_PROCESS_ROLES.includes(resolveRole(role))
}

export function canManageEmployees(role) {
  return EMPLOYEE_MANAGE_ROLES.includes(resolveRole(role))
}

export function canImportExcel(role) {
  return EXCEL_IMPORT_ROLES.includes(resolveRole(role))
}

export function canManageInventoryCounts(role) {
  const resolvedRole = (role !== undefined && role !== null) ? normalizeRole(role) : getCurrentRoleCode()
  return ['ADMIN', 'MANAGER'].includes(resolvedRole)
}

export function canAccessRoute(path, role) {
  const resolvedRole = resolveRole(role)

  if (path === '/employees' || path === '/users') {
    return resolvedRole === 'ADMIN'
  }

  if (path === '/import-excel') {
    return EXCEL_IMPORT_ROLES.includes(resolvedRole)
  }

  if (path === '/partners') {
    return ['ADMIN', 'MANAGER'].includes(resolvedRole)
  }

  if (path === '/approvals' || path === '/pending-export-approvals' || path === '/export-approvals') {
    return ['ADMIN', 'MANAGER'].includes(resolvedRole)
  }

  if (path === '/products' || path === '/warehouses' || path === '/inventory' || path === '/alerts' || path === '/inventory-counts' || /^\/inventory-counts\/[^/]+$/.test(path)) {
    return ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(resolvedRole)
  }

  if (/^\/stock-in\/[^/]+$/.test(path)) {
    // MANAGER cần xem chi tiết phiếu nhập để duyệt/từ chối
    return ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(resolvedRole)
  }

  if (/^\/stock-out\/[^/]+$/.test(path)) {
    return ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(resolvedRole)
  }

  if (/^\/stock-(in|out)\/(?:create|[^/]+\/edit)$/.test(path)) {
    return ['ADMIN', 'EMPLOYEE'].includes(resolvedRole)
  }

  return true
}

export function canCompleteExportReceipt(role) {
  return ['ADMIN', 'EMPLOYEE'].includes(resolveRole(role))
}

