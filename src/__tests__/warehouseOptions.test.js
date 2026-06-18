import { describe, it, expect } from 'vitest'
import {
  warehouseStatusOptions,
  getWarehouseStatusLabel,
} from '../constants/warehouseOptions.js'

describe('warehouseOptions', () => {
  describe('warehouseStatusOptions', () => {
    it('contains exactly two status options', () => {
      expect(warehouseStatusOptions).toHaveLength(2)
    })

    it('includes HOAT_DONG with label "Đang hoạt động"', () => {
      const option = warehouseStatusOptions.find(o => o.value === 'HOAT_DONG')
      expect(option).toBeDefined()
      expect(option.label).toBe('Đang hoạt động')
    })

    it('includes NGUNG_HOAT_DONG with label "Ngừng hoạt động"', () => {
      const option = warehouseStatusOptions.find(o => o.value === 'NGUNG_HOAT_DONG')
      expect(option).toBeDefined()
      expect(option.label).toBe('Ngừng hoạt động')
    })

    it('every option has both value and label properties', () => {
      warehouseStatusOptions.forEach(option => {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
      })
    })
  })

  describe('getWarehouseStatusLabel', () => {
    it('returns "Đang hoạt động" for HOAT_DONG', () => {
      expect(getWarehouseStatusLabel('HOAT_DONG')).toBe('Đang hoạt động')
    })

    it('returns "Ngừng hoạt động" for NGUNG_HOAT_DONG', () => {
      expect(getWarehouseStatusLabel('NGUNG_HOAT_DONG')).toBe('Ngừng hoạt động')
    })

    it('returns the raw status string when the status is unknown', () => {
      expect(getWarehouseStatusLabel('MAINTENANCE')).toBe('MAINTENANCE')
    })

    it('returns "-" when status is an empty string', () => {
      expect(getWarehouseStatusLabel('')).toBe('-')
    })

    it('returns "-" when status is null', () => {
      expect(getWarehouseStatusLabel(null)).toBe('-')
    })

    it('returns "-" when status is undefined', () => {
      expect(getWarehouseStatusLabel(undefined)).toBe('-')
    })

    // Boundary: warehouse business rule — only two valid statuses; verify
    // any third value is passed through as-is (no silent coercion)
    it('does not coerce an arbitrary string to a known status', () => {
      const result = getWarehouseStatusLabel('HOAT_DONG_EXTRA')
      expect(result).toBe('HOAT_DONG_EXTRA')
      expect(result).not.toBe('Đang hoạt động')
    })
  })
})