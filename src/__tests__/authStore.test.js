import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { AUTH_STORAGE_KEYS } from '../services/authService.js'

// Mock authService so the store does not depend on real localStorage reads at import time
vi.mock('../services/authService.js', () => ({
  AUTH_STORAGE_KEYS: {
    accessToken: 'stocksense_access_token',
    tokenType: 'stocksense_token_type',
    expiresIn: 'stocksense_expires_in',
    loginAt: 'stocksense_login_at',
    currentUser: 'stocksense_current_user',
  },
  getAccessToken: vi.fn(() => localStorage.getItem('stocksense_access_token')),
  getCurrentRoleCode: vi.fn(() => {
    const raw = localStorage.getItem('stocksense_current_user')
    if (!raw) return ''
    try {
      const user = JSON.parse(raw)
      return user.role || ''
    } catch {
      return ''
    }
  }),
  AUTH_ROLE_LABELS: {
    ADMIN: 'Admin / IT',
    MANAGER: 'Quản lý kho',
    EMPLOYEE: 'Nhân viên kho',
  },
}))

import { useAuthStore } from '../stores/auth.js'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  // ── initial state ────────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('initializes token as empty string when localStorage has no token', () => {
      const store = useAuthStore()
      expect(store.token).toBe('')
    })

    it('initializes currentRole as empty string when localStorage has no user', () => {
      const store = useAuthStore()
      expect(store.currentRole).toBe('')
    })

    it('initializes token from localStorage when a token is present', () => {
      localStorage.setItem('stocksense_access_token', 'seeded-token')
      const store = useAuthStore()
      expect(store.token).toBe('seeded-token')
    })

    it('initializes currentRole from localStorage when a user is present', () => {
      localStorage.setItem('stocksense_current_user', JSON.stringify({ role: 'MANAGER' }))
      const store = useAuthStore()
      expect(store.currentRole).toBe('MANAGER')
    })
  })

  // ── setRole ──────────────────────────────────────────────────────────────────
  describe('setRole', () => {
    it('updates currentRole reactively', () => {
      const store = useAuthStore()
      store.setRole('ADMIN')
      expect(store.currentRole).toBe('ADMIN')
    })

    it('can set any arbitrary role string', () => {
      const store = useAuthStore()
      store.setRole('EMPLOYEE')
      expect(store.currentRole).toBe('EMPLOYEE')
    })

    it('overwrites a previously set role', () => {
      const store = useAuthStore()
      store.setRole('ADMIN')
      store.setRole('MANAGER')
      expect(store.currentRole).toBe('MANAGER')
    })
  })

  // ── setToken ─────────────────────────────────────────────────────────────────
  describe('setToken', () => {
    it('updates the token ref', () => {
      const store = useAuthStore()
      store.setToken('new-jwt')
      expect(store.token).toBe('new-jwt')
    })

    it('persists the token to localStorage', () => {
      const store = useAuthStore()
      store.setToken('persisted-token')
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)).toBe('persisted-token')
    })

    it('overwrites a previously stored token in localStorage', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, 'old-token')
      const store = useAuthStore()
      store.setToken('fresh-token')
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)).toBe('fresh-token')
    })

    it('setting an empty string clears the stored token', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, 'some-token')
      const store = useAuthStore()
      store.setToken('')
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)).toBe('')
      expect(store.token).toBe('')
    })
  })

  // ── syncFromStorage ──────────────────────────────────────────────────────────
  describe('syncFromStorage', () => {
    it('re-reads token from localStorage after external change', () => {
      const store = useAuthStore()
      expect(store.token).toBe('')

      // Simulate external change to localStorage (e.g. login in another tab)
      localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, 'externally-set-token')
      store.syncFromStorage()

      expect(store.token).toBe('externally-set-token')
    })

    it('re-reads currentRole from localStorage after external change', () => {
      const store = useAuthStore()
      expect(store.currentRole).toBe('')

      localStorage.setItem(
        AUTH_STORAGE_KEYS.currentUser,
        JSON.stringify({ role: 'ADMIN' }),
      )
      store.syncFromStorage()

      expect(store.currentRole).toBe('ADMIN')
    })

    it('resets token to empty string when localStorage token is cleared externally', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, 'initial-token')
      const store = useAuthStore()
      expect(store.token).toBe('initial-token')

      localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken)
      store.syncFromStorage()

      expect(store.token).toBe('')
    })

    it('resets currentRole to empty string when localStorage user is cleared', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify({ role: 'EMPLOYEE' }))
      const store = useAuthStore()
      expect(store.currentRole).toBe('EMPLOYEE')

      localStorage.removeItem(AUTH_STORAGE_KEYS.currentUser)
      store.syncFromStorage()

      expect(store.currentRole).toBe('')
    })
  })

  // ── interaction between setToken and syncFromStorage ─────────────────────────
  describe('setToken then syncFromStorage', () => {
    it('syncFromStorage reflects the token previously set via setToken', () => {
      const store = useAuthStore()
      store.setToken('round-trip-token')
      store.syncFromStorage()
      expect(store.token).toBe('round-trip-token')
    })
  })
})