import { describe, it, expect } from 'vitest'
import {
  employeeRoleOptions,
  employeeStatusOptions,
  getRoleLabel,
  getStatusLabel,
} from '../constants/employeeOptions.js'

describe('employeeOptions', () => {
  // ── employeeRoleOptions ──────────────────────────────────────────────────────
  describe('employeeRoleOptions', () => {
    it('contains exactly three role options', () => {
      expect(employeeRoleOptions).toHaveLength(3)
    })

    it('includes ADMIN role with label "Quản trị viên"', () => {
      const option = employeeRoleOptions.find(o => o.value === 'ADMIN')
      expect(option).toBeDefined()
      expect(option.label).toBe('Quản trị viên')
    })

    it('includes MANAGER role with label "Quản lý kho"', () => {
      const option = employeeRoleOptions.find(o => o.value === 'MANAGER')
      expect(option).toBeDefined()
      expect(option.label).toBe('Quản lý kho')
    })

    it('includes EMPLOYEE role with label "Nhân viên kho"', () => {
      const option = employeeRoleOptions.find(o => o.value === 'EMPLOYEE')
      expect(option).toBeDefined()
      expect(option.label).toBe('Nhân viên kho')
    })

    it('every option has both value and label properties', () => {
      employeeRoleOptions.forEach(option => {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
      })
    })
  })

  // ── employeeStatusOptions ────────────────────────────────────────────────────
  describe('employeeStatusOptions', () => {
    it('contains exactly three status options', () => {
      expect(employeeStatusOptions).toHaveLength(3)
    })

    it('includes HOAT_DONG with label "Hoạt động"', () => {
      const option = employeeStatusOptions.find(o => o.value === 'HOAT_DONG')
      expect(option).toBeDefined()
      expect(option.label).toBe('Hoạt động')
    })

    it('includes TAM_KHOA with label "Tạm khóa"', () => {
      const option = employeeStatusOptions.find(o => o.value === 'TAM_KHOA')
      expect(option).toBeDefined()
      expect(option.label).toBe('Tạm khóa')
    })

    it('includes NGUNG_HOAT_DONG with label "Ngừng hoạt động"', () => {
      const option = employeeStatusOptions.find(o => o.value === 'NGUNG_HOAT_DONG')
      expect(option).toBeDefined()
      expect(option.label).toBe('Ngừng hoạt động')
    })
  })

  // ── getRoleLabel ─────────────────────────────────────────────────────────────
  describe('getRoleLabel', () => {
    it('returns "Quản trị viên" for ADMIN', () => {
      expect(getRoleLabel('ADMIN')).toBe('Quản trị viên')
    })

    it('returns "Quản lý kho" for MANAGER', () => {
      expect(getRoleLabel('MANAGER')).toBe('Quản lý kho')
    })

    it('returns "Nhân viên kho" for EMPLOYEE', () => {
      expect(getRoleLabel('EMPLOYEE')).toBe('Nhân viên kho')
    })

    it('returns the fallbackRoleName when provided, regardless of roleCode', () => {
      expect(getRoleLabel('ADMIN', 'Custom Label')).toBe('Custom Label')
      expect(getRoleLabel('EMPLOYEE', 'Thủ kho')).toBe('Thủ kho')
    })

    it('fallbackRoleName takes priority over a valid roleCode', () => {
      expect(getRoleLabel('MANAGER', 'Override')).toBe('Override')
    })

    it('returns the raw roleCode string when role is unknown and no fallback given', () => {
      expect(getRoleLabel('SUPER_ADMIN')).toBe('SUPER_ADMIN')
    })

    it('returns "-" when roleCode is an empty string and no fallback', () => {
      expect(getRoleLabel('')).toBe('-')
    })

    it('returns "-" when roleCode is null and no fallback', () => {
      expect(getRoleLabel(null)).toBe('-')
    })

    it('returns "-" when roleCode is undefined and no fallback', () => {
      expect(getRoleLabel(undefined)).toBe('-')
    })
  })

  // ── getStatusLabel ───────────────────────────────────────────────────────────
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

    it('returns the raw status string for an unknown status', () => {
      expect(getStatusLabel('PENDING_REVIEW')).toBe('PENDING_REVIEW')
    })

    it('returns "-" for empty string status', () => {
      expect(getStatusLabel('')).toBe('-')
    })

    it('returns "-" for null status', () => {
      expect(getStatusLabel(null)).toBe('-')
    })

    it('returns "-" for undefined status', () => {
      expect(getStatusLabel(undefined)).toBe('-')
    })
  })
})