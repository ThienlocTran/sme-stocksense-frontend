import { getCurrentRoleCode, normalizeRole } from './authService'

const MASTER_DATA_MANAGE_ROLES = ['ADMIN', 'MANAGER']
const MASTER_DATA_VIEW_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE']
const IMPORT_RECEIPT_PROCESS_ROLES = ['ADMIN', 'EMPLOYEE']
const EMPLOYEE_MANAGE_ROLES = ['ADMIN']

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
