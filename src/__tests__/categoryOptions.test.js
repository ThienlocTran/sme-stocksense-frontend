import { describe, it, expect } from 'vitest'
import {
  categoryStatusOptions,
  getCategoryStatusLabel,
} from '../constants/categoryOptions.js'

describe('categoryOptions', () => {
  describe('categoryStatusOptions', () => {
    it('contains exactly two options', () => {
      expect(categoryStatusOptions).toHaveLength(2)
    })

    it('includes HOAT_DONG with label "Hoạt động"', () => {
      const option = categoryStatusOptions.find(o => o.value === 'HOAT_DONG')
      expect(option).toBeDefined()
      expect(option.label).toBe('Hoạt động')
    })

    it('includes NGUNG_HOAT_DONG with label "Ngừng hoạt động"', () => {
      const option = categoryStatusOptions.find(o => o.value === 'NGUNG_HOAT_DONG')
      expect(option).toBeDefined()
      expect(option.label).toBe('Ngừng hoạt động')
    })

    it('every option has both value and label properties', () => {
      categoryStatusOptions.forEach(option => {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
      })
    })
  })

  describe('getCategoryStatusLabel', () => {
    it('returns "Hoạt động" for HOAT_DONG', () => {
      expect(getCategoryStatusLabel('HOAT_DONG')).toBe('Hoạt động')
    })

    it('returns "Ngừng hoạt động" for NGUNG_HOAT_DONG', () => {
      expect(getCategoryStatusLabel('NGUNG_HOAT_DONG')).toBe('Ngừng hoạt động')
    })

    it('returns the raw status string when the status is unknown', () => {
      expect(getCategoryStatusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS')
    })

    it('returns "-" when status is an empty string', () => {
      expect(getCategoryStatusLabel('')).toBe('-')
    })

    it('returns "-" when status is null', () => {
      expect(getCategoryStatusLabel(null)).toBe('-')
    })

    it('returns "-" when status is undefined', () => {
      expect(getCategoryStatusLabel(undefined)).toBe('-')
    })
  })
})