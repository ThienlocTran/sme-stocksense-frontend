import { describe, it, expect } from 'vitest'

import {
  categoryStatusOptions,
  getCategoryStatusLabel,
} from '../constants/categoryOptions'

import {
  employeeRoleOptions,
  employeeStatusOptions,
  getRoleLabel,
  getStatusLabel,
} from '../constants/employeeOptions'

import {
  warehouseStatusOptions,
  getWarehouseStatusLabel,
} from '../constants/warehouseOptions'

// ─────────────────────────────────────────────────────────────────────────────
// categoryOptions
// ─────────────────────────────────────────────────────────────────────────────
describe('categoryStatusOptions', () => {
  it('contains HOAT_DONG and NGUNG_HOAT_DONG entries', () => {
    const values = categoryStatusOptions.map(o => o.value)
    expect(values).toContain('HOAT_DONG')
    expect(values).toContain('NGUNG_HOAT_DONG')
  })

  it('has exactly two options', () => {
    expect(categoryStatusOptions).toHaveLength(2)
  })

  it('has correct label for HOAT_DONG', () => {
    const opt = categoryStatusOptions.find(o => o.value === 'HOAT_DONG')
    expect(opt?.label).toBe('Hoạt động')
  })

  it('has correct label for NGUNG_HOAT_DONG', () => {
    const opt = categoryStatusOptions.find(o => o.value === 'NGUNG_HOAT_DONG')
    expect(opt?.label).toBe('Ngừng hoạt động')
  })
})

describe('getCategoryStatusLabel', () => {
  it('returns "Hoạt động" for HOAT_DONG', () => {
    expect(getCategoryStatusLabel('HOAT_DONG')).toBe('Hoạt động')
  })

  it('returns "Ngừng hoạt động" for NGUNG_HOAT_DONG', () => {
    expect(getCategoryStatusLabel('NGUNG_HOAT_DONG')).toBe('Ngừng hoạt động')
  })

  it('returns the raw status string for an unknown value', () => {
    expect(getCategoryStatusLabel('UNKNOWN')).toBe('UNKNOWN')
  })

  it('returns "-" for null', () => {
    expect(getCategoryStatusLabel(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(getCategoryStatusLabel(undefined)).toBe('-')
  })

  it('returns "-" for empty string', () => {
    expect(getCategoryStatusLabel('')).toBe('-')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// employeeOptions
// ─────────────────────────────────────────────────────────────────────────────
describe('employeeRoleOptions', () => {
  it('contains ADMIN, MANAGER, and EMPLOYEE entries', () => {
    const values = employeeRoleOptions.map(o => o.value)
    expect(values).toContain('ADMIN')
    expect(values).toContain('MANAGER')
    expect(values).toContain('EMPLOYEE')
  })

  it('has exactly three options', () => {
    expect(employeeRoleOptions).toHaveLength(3)
  })

  it('has correct labels', () => {
    const find = v => employeeRoleOptions.find(o => o.value === v)?.label
    expect(find('ADMIN')).toBe('Quản trị viên')
    expect(find('MANAGER')).toBe('Quản lý kho')
    expect(find('EMPLOYEE')).toBe('Nhân viên kho')
  })
})

describe('employeeStatusOptions', () => {
  it('contains HOAT_DONG, TAM_KHOA, and NGUNG_HOAT_DONG', () => {
    const values = employeeStatusOptions.map(o => o.value)
    expect(values).toContain('HOAT_DONG')
    expect(values).toContain('TAM_KHOA')
    expect(values).toContain('NGUNG_HOAT_DONG')
  })

  it('has exactly three options', () => {
    expect(employeeStatusOptions).toHaveLength(3)
  })

  it('has correct label for TAM_KHOA', () => {
    const opt = employeeStatusOptions.find(o => o.value === 'TAM_KHOA')
    expect(opt?.label).toBe('Tạm khóa')
  })
})

describe('getRoleLabel', () => {
  it('returns the fallback role name when provided', () => {
    expect(getRoleLabel('ADMIN', 'My Custom Label')).toBe('My Custom Label')
  })

  it('returns label for ADMIN when no fallback', () => {
    expect(getRoleLabel('ADMIN')).toBe('Quản trị viên')
  })

  it('returns label for MANAGER when no fallback', () => {
    expect(getRoleLabel('MANAGER')).toBe('Quản lý kho')
  })

  it('returns label for EMPLOYEE when no fallback', () => {
    expect(getRoleLabel('EMPLOYEE')).toBe('Nhân viên kho')
  })

  it('returns raw roleCode for unknown value', () => {
    expect(getRoleLabel('UNKNOWN_CODE')).toBe('UNKNOWN_CODE')
  })

  it('returns "-" for null roleCode without fallback', () => {
    expect(getRoleLabel(null)).toBe('-')
  })

  it('returns "-" for undefined roleCode without fallback', () => {
    expect(getRoleLabel(undefined)).toBe('-')
  })

  it('returns "-" for empty string roleCode without fallback', () => {
    expect(getRoleLabel('')).toBe('-')
  })

  it('ignores empty string fallback and falls back to roleCode lookup', () => {
    // Empty string is falsy, so fallbackRoleName check fails → looks up roleCode
    expect(getRoleLabel('MANAGER', '')).toBe('Quản lý kho')
  })
})

describe('getStatusLabel', () => {
  it('returns "Hoạt động" for HOAT_DONG', () => {
    expect(getStatusLabel('HOAT_DONG')).toBe('Hoạt động')
  })

  it('returns "Tạm khóa" for TAM_KHOA', () => {
    expect(getStatusLabel('TAM_KHOA')).toBe('Tạm khóa')
  })

  it('returns "Ngừng hoạt động" for NGUNG_HOAT_DONG', () => {
    expect(getStatusLabel('NGUNG_HOAT_DONG')).toBe('Ngừng hoạt động')
  })

  it('returns raw status string for unknown value', () => {
    expect(getStatusLabel('LOCKED')).toBe('LOCKED')
  })

  it('returns "-" for null', () => {
    expect(getStatusLabel(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(getStatusLabel(undefined)).toBe('-')
  })

  it('returns "-" for empty string', () => {
    expect(getStatusLabel('')).toBe('-')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// warehouseOptions
// ─────────────────────────────────────────────────────────────────────────────
describe('warehouseStatusOptions', () => {
  it('contains HOAT_DONG and NGUNG_HOAT_DONG', () => {
    const values = warehouseStatusOptions.map(o => o.value)
    expect(values).toContain('HOAT_DONG')
    expect(values).toContain('NGUNG_HOAT_DONG')
  })

  it('has exactly two options', () => {
    expect(warehouseStatusOptions).toHaveLength(2)
  })

  it('has correct labels', () => {
    const find = v => warehouseStatusOptions.find(o => o.value === v)?.label
    expect(find('HOAT_DONG')).toBe('Đang hoạt động')
    expect(find('NGUNG_HOAT_DONG')).toBe('Ngừng hoạt động')
  })
})

describe('getWarehouseStatusLabel', () => {
  it('returns "Đang hoạt động" for HOAT_DONG', () => {
    expect(getWarehouseStatusLabel('HOAT_DONG')).toBe('Đang hoạt động')
  })

  it('returns "Ngừng hoạt động" for NGUNG_HOAT_DONG', () => {
    expect(getWarehouseStatusLabel('NGUNG_HOAT_DONG')).toBe('Ngừng hoạt động')
  })

  it('returns raw status string for unknown value', () => {
    expect(getWarehouseStatusLabel('INACTIVE')).toBe('INACTIVE')
  })

  it('returns "-" for null', () => {
    expect(getWarehouseStatusLabel(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(getWarehouseStatusLabel(undefined)).toBe('-')
  })

  it('returns "-" for empty string', () => {
    expect(getWarehouseStatusLabel('')).toBe('-')
  })
})