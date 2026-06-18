import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'

// Mock axios before importing the module under test
vi.mock('axios', () => {
  const mockPost = vi.fn()
  const mockPatch = vi.fn()
  const create = vi.fn(() => ({ post: mockPost, patch: mockPatch }))
  return { default: { create } }
})

import {
  AUTH_STORAGE_KEYS,
  AUTH_ROLE_LABELS,
  getAccessToken,
  isAuthenticated,
  getCurrentUser,
  getAuthorizationHeader,
  getCurrentRoleCode,
  getCurrentRoleLabel,
  formatRole,
  clearAuth,
  login,
  changeOwnPassword,
} from '../services/authService.js'

// Helper: seed a full valid auth state into localStorage
function seedValidAuth({
  token = 'test-token',
  tokenType = 'Bearer',
  expiresIn = 3600,
  loginAt = Date.now(),
  user = { employeeId: 1, fullName: 'Nguyen Van A', email: 'a@example.com', role: 'ADMIN', status: 'HOAT_DONG' },
} = {}) {
  localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, token)
  localStorage.setItem(AUTH_STORAGE_KEYS.tokenType, tokenType)
  localStorage.setItem(AUTH_STORAGE_KEYS.expiresIn, String(expiresIn))
  localStorage.setItem(AUTH_STORAGE_KEYS.loginAt, String(loginAt))
  localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify(user))
}

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  // ── AUTH_STORAGE_KEYS ────────────────────────────────────────────────────────
  describe('AUTH_STORAGE_KEYS', () => {
    it('exports the correct storage key names', () => {
      expect(AUTH_STORAGE_KEYS.accessToken).toBe('stocksense_access_token')
      expect(AUTH_STORAGE_KEYS.tokenType).toBe('stocksense_token_type')
      expect(AUTH_STORAGE_KEYS.expiresIn).toBe('stocksense_expires_in')
      expect(AUTH_STORAGE_KEYS.loginAt).toBe('stocksense_login_at')
      expect(AUTH_STORAGE_KEYS.currentUser).toBe('stocksense_current_user')
    })
  })

  // ── AUTH_ROLE_LABELS ─────────────────────────────────────────────────────────
  describe('AUTH_ROLE_LABELS', () => {
    it('maps ADMIN to Admin / IT', () => {
      expect(AUTH_ROLE_LABELS.ADMIN).toBe('Admin / IT')
    })
    it('maps MANAGER to Quản lý kho', () => {
      expect(AUTH_ROLE_LABELS.MANAGER).toBe('Quản lý kho')
    })
    it('maps EMPLOYEE to Nhân viên kho', () => {
      expect(AUTH_ROLE_LABELS.EMPLOYEE).toBe('Nhân viên kho')
    })
  })

  // ── getAccessToken ───────────────────────────────────────────────────────────
  describe('getAccessToken', () => {
    it('returns null when no token is stored', () => {
      expect(getAccessToken()).toBeNull()
    })

    it('returns the stored token', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, 'abc123')
      expect(getAccessToken()).toBe('abc123')
    })
  })

  // ── clearAuth ────────────────────────────────────────────────────────────────
  describe('clearAuth', () => {
    it('removes all AUTH_STORAGE_KEYS entries from localStorage', () => {
      seedValidAuth()
      clearAuth()
      Object.values(AUTH_STORAGE_KEYS).forEach(key => {
        expect(localStorage.getItem(key)).toBeNull()
      })
    })

    it('also removes legacy keys stocksense-demo-role, user_role, token', () => {
      localStorage.setItem('stocksense-demo-role', 'MANAGER')
      localStorage.setItem('user_role', 'EMPLOYEE')
      localStorage.setItem('token', 'legacy-token')
      clearAuth()
      expect(localStorage.getItem('stocksense-demo-role')).toBeNull()
      expect(localStorage.getItem('user_role')).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
    })

    it('is idempotent – calling twice does not throw', () => {
      expect(() => {
        clearAuth()
        clearAuth()
      }).not.toThrow()
    })
  })

  // ── getCurrentUser ───────────────────────────────────────────────────────────
  describe('getCurrentUser', () => {
    it('returns null when no user is stored', () => {
      expect(getCurrentUser()).toBeNull()
    })

    it('returns the parsed user object', () => {
      const user = { employeeId: 42, fullName: 'Test User', email: 't@example.com', role: 'MANAGER', status: 'HOAT_DONG' }
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify(user))
      expect(getCurrentUser()).toEqual(user)
    })

    it('calls clearAuth and returns null when stored value is invalid JSON', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, 'NOT_JSON')
      // also seed a token so we can verify clearAuth ran
      localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, 'some-token')
      const result = getCurrentUser()
      expect(result).toBeNull()
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)).toBeNull()
    })
  })

  // ── isAuthenticated ──────────────────────────────────────────────────────────
  describe('isAuthenticated', () => {
    it('returns false when localStorage is empty', () => {
      expect(isAuthenticated()).toBe(false)
    })

    it('returns false and calls clearAuth when only token is present (no user)', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, 'token-only')
      expect(isAuthenticated()).toBe(false)
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)).toBeNull()
    })

    it('returns false and calls clearAuth when only user is present (no token)', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify({ employeeId: 1 }))
      expect(isAuthenticated()).toBe(false)
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.currentUser)).toBeNull()
    })

    it('returns true when both token and user exist and token has not expired', () => {
      seedValidAuth({ expiresIn: 3600, loginAt: Date.now() - 1000 })
      expect(isAuthenticated()).toBe(true)
    })

    it('returns false and clears auth when token is expired', () => {
      const loginAt = Date.now() - 7200 * 1000 // 2 hours ago
      seedValidAuth({ expiresIn: 3600, loginAt })
      expect(isAuthenticated()).toBe(false)
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)).toBeNull()
    })

    it('returns true when expiresIn is 0 (no expiry enforced)', () => {
      seedValidAuth({ expiresIn: 0 })
      expect(isAuthenticated()).toBe(true)
    })
  })

  // ── getAuthorizationHeader ───────────────────────────────────────────────────
  describe('getAuthorizationHeader', () => {
    it('returns empty object when no token is stored', () => {
      expect(getAuthorizationHeader()).toEqual({})
    })

    it('returns Authorization header with Bearer prefix by default', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, 'my-token')
      expect(getAuthorizationHeader()).toEqual({ Authorization: 'Bearer my-token' })
    })

    it('uses the stored tokenType in the header', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, 'my-token')
      localStorage.setItem(AUTH_STORAGE_KEYS.tokenType, 'Token')
      expect(getAuthorizationHeader()).toEqual({ Authorization: 'Token my-token' })
    })
  })

  // ── getCurrentRoleCode ───────────────────────────────────────────────────────
  describe('getCurrentRoleCode', () => {
    it('returns empty string when no user is stored', () => {
      expect(getCurrentRoleCode()).toBe('')
    })

    it('returns the role code directly when stored as a code (ADMIN)', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify({ role: 'ADMIN' }))
      expect(getCurrentRoleCode()).toBe('ADMIN')
    })

    it('returns MANAGER when stored as a code', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify({ role: 'MANAGER' }))
      expect(getCurrentRoleCode()).toBe('MANAGER')
    })

    it('returns EMPLOYEE when stored as a code', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify({ role: 'EMPLOYEE' }))
      expect(getCurrentRoleCode()).toBe('EMPLOYEE')
    })

    it('normalizes role label "Admin / IT" to ADMIN', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify({ role: 'Admin / IT' }))
      expect(getCurrentRoleCode()).toBe('ADMIN')
    })

    it('normalizes role label "Quản lý kho" to MANAGER', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify({ role: 'Quản lý kho' }))
      expect(getCurrentRoleCode()).toBe('MANAGER')
    })

    it('normalizes role label "Nhân viên kho" to EMPLOYEE', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify({ role: 'Nhân viên kho' }))
      expect(getCurrentRoleCode()).toBe('EMPLOYEE')
    })
  })

  // ── getCurrentRoleLabel ──────────────────────────────────────────────────────
  describe('getCurrentRoleLabel', () => {
    it('returns empty string when no user is stored', () => {
      expect(getCurrentRoleLabel()).toBe('')
    })

    it('returns "Admin / IT" for ADMIN role code', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify({ role: 'ADMIN' }))
      expect(getCurrentRoleLabel()).toBe('Admin / IT')
    })

    it('returns "Quản lý kho" for MANAGER role code', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify({ role: 'MANAGER' }))
      expect(getCurrentRoleLabel()).toBe('Quản lý kho')
    })

    it('returns "Nhân viên kho" for EMPLOYEE role code', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.currentUser, JSON.stringify({ role: 'EMPLOYEE' }))
      expect(getCurrentRoleLabel()).toBe('Nhân viên kho')
    })
  })

  // ── formatRole ───────────────────────────────────────────────────────────────
  describe('formatRole', () => {
    it('returns "Admin / IT" for raw role code "ADMIN"', () => {
      expect(formatRole('ADMIN')).toBe('Admin / IT')
    })

    it('returns "Quản lý kho" for raw role code "MANAGER"', () => {
      expect(formatRole('MANAGER')).toBe('Quản lý kho')
    })

    it('returns "Nhân viên kho" for raw role code "EMPLOYEE"', () => {
      expect(formatRole('EMPLOYEE')).toBe('Nhân viên kho')
    })

    it('returns "Admin / IT" when given the label "Admin / IT" (label→code→label round-trip)', () => {
      expect(formatRole('Admin / IT')).toBe('Admin / IT')
    })

    it('returns "Quản lý kho" when given the label "Quản lý kho" (label→code→label round-trip)', () => {
      expect(formatRole('Quản lý kho')).toBe('Quản lý kho')
    })

    it('returns the raw value when role is unknown', () => {
      expect(formatRole('UNKNOWN_ROLE')).toBe('UNKNOWN_ROLE')
    })

    it('returns empty string when role is null/undefined', () => {
      expect(formatRole(null)).toBe('')
      expect(formatRole(undefined)).toBe('')
    })
  })

  // ── login ────────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('stores auth data in localStorage and returns the response on success', async () => {
      const responseData = {
        accessToken: 'jwt-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        employeeId: 5,
        fullName: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN',
        status: 'HOAT_DONG',
      }

      // Get the mocked axios client's post method
      const mockClient = axios.create()
      mockClient.post.mockResolvedValueOnce({ data: responseData })

      await login('admin@example.com', 'password123')

      expect(localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)).toBe('jwt-token')
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.tokenType)).toBe('Bearer')
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.expiresIn)).toBe('3600')
      const storedUser = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEYS.currentUser))
      expect(storedUser.employeeId).toBe(5)
      expect(storedUser.email).toBe('admin@example.com')
      expect(storedUser.role).toBe('ADMIN')
    })

    it('throws a normalized error object with status when server returns 401', async () => {
      const mockClient = axios.create()
      mockClient.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: 'Email hoặc mật khẩu không đúng.', errors: {} },
        },
      })

      await expect(login('bad@example.com', 'wrong')).rejects.toMatchObject({
        status: 401,
        message: 'Email hoặc mật khẩu không đúng.',
      })
    })

    it('throws a network error object with status 0 when server is unreachable', async () => {
      const mockClient = axios.create()
      mockClient.post.mockRejectedValueOnce({}) // no .response property

      await expect(login('a@example.com', 'pass')).rejects.toMatchObject({
        status: 0,
        message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
      })
    })

    it('throws with errors map when server returns field-level errors', async () => {
      const mockClient = axios.create()
      mockClient.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: null, errors: { email: 'Email không đúng định dạng.' } },
        },
      })

      await expect(login('abc', 'pass')).rejects.toMatchObject({
        status: 400,
        errors: { email: 'Email không đúng định dạng.' },
      })
    })
  })

  // ── changeOwnPassword ────────────────────────────────────────────────────────
  describe('changeOwnPassword', () => {
    it('returns response data on success', async () => {
      const mockClient = axios.create()
      mockClient.patch.mockResolvedValueOnce({ data: { message: 'Đổi mật khẩu thành công.' } })

      const result = await changeOwnPassword({
        currentPassword: 'old',
        newPassword: 'newPass1',
        confirmPassword: 'newPass1',
      })

      expect(result).toEqual({ message: 'Đổi mật khẩu thành công.' })
    })

    it('throws normalized error with status 401 and clears auth when unauthorized', async () => {
      seedValidAuth()
      const mockClient = axios.create()
      mockClient.patch.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: 'Phiên đăng nhập đã hết hạn.', errors: {} },
        },
      })

      await expect(
        changeOwnPassword({ currentPassword: 'x', newPassword: 'y', confirmPassword: 'y' }),
      ).rejects.toMatchObject({ status: 401 })

      // clearAuth should have been called by normalizeAuthError on 401
      expect(localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)).toBeNull()
    })

    it('throws network error object when server is unreachable', async () => {
      const mockClient = axios.create()
      mockClient.patch.mockRejectedValueOnce({}) // no .response

      await expect(
        changeOwnPassword({ currentPassword: 'x', newPassword: 'y', confirmPassword: 'y' }),
      ).rejects.toMatchObject({
        status: 0,
        message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
      })
    })
  })
})