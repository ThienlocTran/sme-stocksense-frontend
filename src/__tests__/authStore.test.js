import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock authService before importing the store
vi.mock('../services/authService', () => ({
  AUTH_STORAGE_KEYS: {
    accessToken: 'stocksense_access_token',
    tokenType: 'stocksense_token_type',
    expiresIn: 'stocksense_expires_in',
    loginAt: 'stocksense_login_at',
    currentUser: 'stocksense_current_user',
  },
  getAccessToken: vi.fn(() => null),
  getCurrentRoleCode: vi.fn(() => ''),
}))

import { getAccessToken, getCurrentRoleCode } from '../services/authService'
import { useAuthStore } from '../stores/auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.resetAllMocks()
    getAccessToken.mockReturnValue(null)
    getCurrentRoleCode.mockReturnValue('')
  })

  it('initializes with empty token and role when storage is empty', () => {
    const store = useAuthStore()
    expect(store.token).toBe('')
    expect(store.currentRole).toBe('')
  })

  it('initializes token from storage when present', () => {
    getAccessToken.mockReturnValue('stored-token')
    getCurrentRoleCode.mockReturnValue('MANAGER')

    const store = useAuthStore()
    expect(store.token).toBe('stored-token')
    expect(store.currentRole).toBe('MANAGER')
  })

  describe('setRole', () => {
    it('updates currentRole in the store', () => {
      const store = useAuthStore()
      store.setRole('ADMIN')
      expect(store.currentRole).toBe('ADMIN')
    })

    it('updates to MANAGER', () => {
      const store = useAuthStore()
      store.setRole('MANAGER')
      expect(store.currentRole).toBe('MANAGER')
    })

    it('updates to EMPLOYEE', () => {
      const store = useAuthStore()
      store.setRole('EMPLOYEE')
      expect(store.currentRole).toBe('EMPLOYEE')
    })

    it('can be called multiple times overwriting previous value', () => {
      const store = useAuthStore()
      store.setRole('ADMIN')
      store.setRole('EMPLOYEE')
      expect(store.currentRole).toBe('EMPLOYEE')
    })
  })

  describe('setToken', () => {
    it('updates token in the store', () => {
      const store = useAuthStore()
      store.setToken('new-jwt-token')
      expect(store.token).toBe('new-jwt-token')
    })

    it('persists the token to localStorage', () => {
      const store = useAuthStore()
      store.setToken('persisted-token')
      expect(localStorage.getItem('stocksense_access_token')).toBe('persisted-token')
    })

    it('can overwrite an existing token', () => {
      const store = useAuthStore()
      store.setToken('first-token')
      store.setToken('second-token')
      expect(store.token).toBe('second-token')
      expect(localStorage.getItem('stocksense_access_token')).toBe('second-token')
    })

    it('stores empty string token (e.g. after explicit clear)', () => {
      const store = useAuthStore()
      store.setToken('')
      expect(store.token).toBe('')
      expect(localStorage.getItem('stocksense_access_token')).toBe('')
    })
  })

  describe('syncFromStorage', () => {
    it('updates token and role from storage', () => {
      const store = useAuthStore()
      // Simulate updated storage
      getAccessToken.mockReturnValue('refreshed-token')
      getCurrentRoleCode.mockReturnValue('ADMIN')

      store.syncFromStorage()

      expect(store.token).toBe('refreshed-token')
      expect(store.currentRole).toBe('ADMIN')
    })

    it('resets to empty string when storage has been cleared', () => {
      getAccessToken.mockReturnValue('old-token')
      getCurrentRoleCode.mockReturnValue('MANAGER')
      const store = useAuthStore()

      // Storage cleared externally
      getAccessToken.mockReturnValue(null)
      getCurrentRoleCode.mockReturnValue('')

      store.syncFromStorage()

      expect(store.token).toBe('')
      expect(store.currentRole).toBe('')
    })

    it('can be called multiple times without error', () => {
      const store = useAuthStore()
      expect(() => {
        store.syncFromStorage()
        store.syncFromStorage()
      }).not.toThrow()
    })
  })
})