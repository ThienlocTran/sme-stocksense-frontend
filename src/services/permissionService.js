import { getCurrentRoleCode, normalizeRole } from './authService'

const MASTER_DATA_MANAGE_ROLES = ['ADMIN', 'MANAGER']
const MASTER_DATA_VIEW_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE']
const IMPORT_RECEIPT_PROCESS_ROLES = ['ADMIN', 'EMPLOYEE']
const EMPLOYEE_MANAGE_ROLES = ['ADMIN']
const EXCEL_IMPORT_ROLES = ['ADMIN']

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

export function canAccessRoute(path, role) {
  const resolvedRole = resolveRole(role)

  if (path === '/employees' || path === '/users' || path === '/import-excel') {
    return resolvedRole === 'ADMIN'
  }

  if (path === '/partners') {
    return ['ADMIN', 'MANAGER'].includes(resolvedRole)
  }

  if (path === '/approvals' || path === '/pending-export-approvals') {
    return ['ADMIN', 'MANAGER'].includes(resolvedRole)
  }

  if (/^\/stock-(in|out)\/(create|[^/]+\/edit)$/.test(path)) {
    return ['ADMIN', 'EMPLOYEE'].includes(resolvedRole)
  }

  return true
}
